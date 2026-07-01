from contextlib import asynccontextmanager
from uuid import uuid4
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from app.api.v1.router import router as v1_router
from app.db.client import connect, disconnect
from app.models.errors import (
    ModelNotAllowedError, InjectionDetectedError,
    CanaryLeakError, RateLimitExceededError
)
from app.security.middleware import request_size_limit
from app.config import get_settings
from app.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Orch starting env={settings.env} version={settings.app_version}")
    await connect()

    # Index all constraints for RAG on startup (background, non-blocking)
    async def _index_on_startup():
        try:
            from app.workers.constraint_indexer import index_all_constraints
            results = await index_all_constraints()
            total = sum(results.values())
            logger.info(f"RAG startup indexing complete constraints={len(results)} chunks={total}")
        except Exception as e:
            logger.warning(f"RAG startup indexing failed (non-critical): {e}")

    import asyncio
    asyncio.create_task(_index_on_startup())

    yield
    await disconnect()
    logger.info("Orch shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Orch API",
        description="Bring your own AI. We make sure it follows your rules.",
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    # --- Request size limit ---
    app.middleware("http")(request_size_limit)

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Model-API-Key", "X-Request-ID"],
        expose_headers=["X-Request-ID", "Retry-After"],
    )

    # --- Request ID middleware ---
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    # --- Security headers middleware ---
    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response

    # --- Exception handlers ---

    @app.exception_handler(ValidationError)
    async def validation_error(request: Request, exc: ValidationError):
        errors = [
            {"field": ".".join(str(l) for l in e["loc"]), "message": e["msg"]}
            for e in exc.errors()
        ]
        return JSONResponse(status_code=422, content={
            "error": "validation_error",
            "message": "Request validation failed.",
            "errors": errors,
            "request_id": getattr(request.state, "request_id", None)
        })

    @app.exception_handler(RateLimitExceededError)
    async def rate_limit_exceeded(request: Request, exc: RateLimitExceededError):
        response = JSONResponse(status_code=429, content={
            "error": "rate_limit_exceeded",
            "message": str(exc),
            "limit": exc.limit,
            "reset_in_seconds": exc.reset_in,
            "hint": f"Retry in {exc.reset_in} seconds or upgrade your plan.",
            "request_id": getattr(request.state, "request_id", None)
        })
        response.headers["Retry-After"] = str(exc.reset_in)
        return response

    @app.exception_handler(ModelNotAllowedError)
    async def model_not_allowed(request: Request, exc: ModelNotAllowedError):
        return JSONResponse(status_code=403, content={
            "error": "model_not_allowed",
            "message": str(exc),
            "allowed_models": exc.allowed,
            "hint": "Ask your admin to add this model in the Orch dashboard.",
            "request_id": getattr(request.state, "request_id", None)
        })

    @app.exception_handler(InjectionDetectedError)
    async def injection_detected(request: Request, exc: InjectionDetectedError):
        logger.warning(f"Injection attempt request_id={getattr(request.state, 'request_id', '')}")
        return JSONResponse(status_code=400, content={
            "error": "injection_detected",
            "message": "Your prompt was flagged by Orch's security layer.",
            "hint": "Remove any instructions that attempt to override system behavior.",
            "request_id": getattr(request.state, "request_id", None)
        })

    @app.exception_handler(CanaryLeakError)
    async def canary_leak(request: Request, exc: CanaryLeakError):
        logger.error(f"Canary leak request_id={getattr(request.state, 'request_id', '')}")
        return JSONResponse(status_code=500, content={
            "error": "security_violation",
            "message": "A security violation was detected and the response was blocked.",
            "request_id": getattr(request.state, "request_id", None)
        })

    @app.exception_handler(Exception)
    async def unhandled_exception(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", None)
        logger.error(f"Unhandled exception request_id={request_id} error={exc}", exc_info=True)
        return JSONResponse(status_code=500, content={
            "error": "internal_error",
            "message": "An unexpected error occurred.",
            "request_id": request_id
        })

    # --- Health check ---
    @app.get("/health", tags=["Health"], include_in_schema=False)
    def health():
        return {"status": "ok", "version": settings.app_version, "env": settings.env}

    # --- Routes ---
    app.include_router(v1_router)

    return app
