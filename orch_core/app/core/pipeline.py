import asyncio
from typing import AsyncGenerator
from app.config import get_settings
from app.models.schemas import PromptRequest, OrchResponse
from app.models.errors import InjectionDetectedError, CanaryLeakError
from app.db.client import db
from app.db.repositories.session import SessionRepository
from app.db.repositories.constraint import ConstraintRepository
from app.db.repositories.model_config import ModelConfigRepository
from app.core.domain_router import detect_domain
from app.core.model_resolver import resolve_model
from app.core.constraint_loader import load_constraint
from app.core.context_manager import build_context
from app.security.injection import scan_for_injection, generate_canary, check_canary_leak
from app.services.llm import complete, complete_stream
from app.workers.persistence import persist_turn
from app.workers.health_worker import schedule_health_recompute
from app.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


async def _prepare(request: PromptRequest, team=None) -> tuple[dict, list, str, str, str, str]:
    """
    Shared setup for both streaming and non-streaming pipelines.
    Returns (model_config, messages, guarded_instruction, session_id, target_domain, canary)
    """
    if scan_for_injection(request.user_prompt):
        logger.warning("Injection attempt detected")
        raise InjectionDetectedError("Prompt flagged by Orch security layer.")

    session_repo = SessionRepository(db)
    constraint_repo = ConstraintRepository(db)
    model_config_repo = ModelConfigRepository(db)

    member_id: str | None = None
    developer_model_key: str | None = None
    if team:
        resolved_member = getattr(team, "resolved_member", None)
        member_id = resolved_member.id if resolved_member else None
        developer_model_key = getattr(team, "developer_model_key", None)

    # --- Phase 1: run independent lookups in parallel ---
    # session history and domain detection have no dependency on each other
    session_task = (
        session_repo.get_with_messages(request.session_id)
        if request.session_id else asyncio.sleep(0, result=None)
    )
    domain_task = (
        detect_domain(request.user_prompt)
        if request.domain.lower() == "auto"
        else asyncio.sleep(0, result=request.domain.lower())
    )

    session_result, target_domain = await asyncio.gather(session_task, domain_task)

    # --- Session setup ---
    session_id = request.session_id
    history = []

    if session_id:
        if session_result:
            history = session_result.messages
        else:
            session_result = await session_repo.create_with_id(
                session_id, team_id=team.id if team else None, member_id=member_id
            )

    # --- Phase 2: model resolution and constraint loading in parallel ---
    # both depend on target_domain being known, but not on each other
    if team:
        model_task = resolve_model(
            request.model, team, model_config_repo,
            developer_model_key=developer_model_key
        )
    else:
        model_id = request.model if request.model != "auto" else settings.default_model
        async def _static_model():
            return {
                "model_id": model_id, "endpoint": None,
                "api_key": None,
                "display_name": model_id, "context_window": None,
                "key_source": "env_fallback", "fallback_configs": []
            }
        model_task = _static_model()

    # constraint loading only needs domain, not the resolved model_id
    # pass the prompt so RAG can retrieve relevant chunks
    constraint_task = load_constraint(
        target_domain, request.model, constraint_repo,
        prompt=request.user_prompt,
        api_key=developer_model_key,
    )

    model_config, (system_instruction, constraint_version) = await asyncio.gather(
        model_task, constraint_task
    )

    # If model was "auto", constraint was loaded with unresolved model id.
    # Re-pick the correct per-model variant now that we know the real model_id.
    if request.model == "auto" or request.model != model_config["model_id"]:
        from app.core.constraint_loader import _pick_variant
        from app.services.cache import get_constraint
        cached = await get_constraint(target_domain)
        if cached:
            system_instruction = _pick_variant(cached, model_config["model_id"])

    # --- Session creation if new ---
    if not session_id:
        session_result = await session_repo.create(
            team_id=team.id if team else None,
            constraint_version=constraint_version,
            member_id=member_id
        )
        session_id = session_result.id

    canary = generate_canary()
    guarded_instruction = f"{system_instruction}\n{canary}"

    messages = await build_context(
        history=history,
        current_prompt=request.user_prompt,
        system_instruction=guarded_instruction,
        model_id=model_config["model_id"],
        model_config=model_config
    )

    return model_config, messages, guarded_instruction, session_id, target_domain, canary


async def run_pipeline(request: PromptRequest, team=None) -> OrchResponse:
    """Standard non-streaming pipeline. Returns full response."""
    logger.info(f"Pipeline started domain={request.domain} model={request.model}")

    model_config, messages, guarded_instruction, session_id, target_domain, canary = \
        await _prepare(request, team)

    output, input_tokens, output_tokens = await complete(
        model_id=model_config["model_id"],
        messages=messages,
        system_instruction=guarded_instruction,
        api_key=model_config.get("api_key"),
        endpoint=model_config.get("endpoint"),
        fallback_configs=model_config.get("fallback_configs", []),
        use_cache=True
    )

    if check_canary_leak(output, canary):
        logger.error(f"Canary leak detected session={session_id}")
        raise CanaryLeakError("Security violation: system prompt leaked in response.")

    asyncio.create_task(persist_turn(
        session_id, request.user_prompt, output,
        model_config["model_id"], input_tokens, output_tokens
    ))
    if team:
        schedule_health_recompute(target_domain, team.orgId)

    logger.info(f"Pipeline complete session={session_id} domain={target_domain}")

    return OrchResponse(
        domain_identified=target_domain,
        model_executed=model_config["display_name"],
        session_id=session_id,
        structured_output=output,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        key_source=model_config.get("key_source", "env_fallback")
    )


async def run_pipeline_stream(
    request: PromptRequest,
    team=None
) -> AsyncGenerator[str, None]:
    """
    Streaming pipeline. Yields Server-Sent Events (SSE) formatted chunks.
    Format: data: <chunk>\n\n
    Final event: data: [DONE]\n\n
    """
    logger.info(f"Stream pipeline started domain={request.domain} model={request.model}")

    model_config, messages, guarded_instruction, session_id, target_domain, canary = \
        await _prepare(request, team)

    # Yield metadata first so client knows session_id immediately
    import json
    meta = json.dumps({
        "type": "meta",
        "session_id": session_id,
        "domain": target_domain,
        "model": model_config["display_name"],
        "key_source": model_config.get("key_source", "env_fallback")
    })
    yield f"data: {meta}\n\n"

    full_output = []
    async for chunk in complete_stream(
        model_id=model_config["model_id"],
        messages=messages,
        system_instruction=guarded_instruction,
        api_key=model_config.get("api_key"),
        endpoint=model_config.get("endpoint"),
        fallback_configs=model_config.get("fallback_configs", [])
    ):
        full_output.append(chunk)
        payload = json.dumps({"type": "chunk", "content": chunk})
        yield f"data: {payload}\n\n"

    assembled = "".join(full_output)

    # Canary check on assembled output
    if check_canary_leak(assembled, canary):
        logger.error(f"Canary leak in stream session={session_id}")
        yield f"data: {json.dumps({'type': 'error', 'message': 'Security violation detected.'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # Persist in background
    asyncio.create_task(persist_turn(
        session_id, request.user_prompt, assembled,
        model_config["model_id"], 0, 0
    ))
    if team:
        schedule_health_recompute(target_domain, team.orgId)

    yield "data: [DONE]\n\n"
    logger.info(f"Stream pipeline complete session={session_id} domain={target_domain}")
