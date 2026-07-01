from fastapi import Request
from fastapi.responses import JSONResponse

MAX_BODY_SIZE = 512 * 1024  # 512KB hard limit


async def request_size_limit(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(status_code=413, content={
            "error": "request_too_large",
            "message": f"Request body exceeds maximum allowed size of {MAX_BODY_SIZE // 1024}KB."
        })

    if request.method in ("POST", "PUT", "PATCH"):
        content_type = request.headers.get("content-type", "")
        if not content_type.startswith("application/json"):
            return JSONResponse(status_code=415, content={
                "error": "unsupported_media_type",
                "message": "Content-Type must be application/json."
            })

    return await call_next(request)
