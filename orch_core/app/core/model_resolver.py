import asyncio
from app.config import get_settings
from app.models.errors import ModelNotAllowedError
from app.services.encryption import decrypt_key
from app.db.repositories.model_config import ModelConfigRepository
from app.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


async def resolve_model(
    requested_model: str,
    team,
    repo: ModelConfigRepository,
    developer_model_key: str | None = None
) -> dict:
    """
    Resolves which model to use and which API key to use.

    Key source priority:
    1. Enforced policy  -> org's configured model + org's key, ignores everything else
    2. Developer key    -> developer's personal X-Model-API-Key (open/allowlist only)
    3. Org model config -> team's shared key from ModelConfig table
    4. Env fallback     -> GEMINI_API_KEY from settings

    Also resolves the fallback chain for automatic failover.
    """
    org = team.org
    policy = org.modelPolicy

    # --- Resolve primary model ID ---

    if policy == "enforced":
        model_id = org.enforcedModel or _default(org)
        developer_model_key = None  # enforced ignores personal keys
        logger.debug(f"Model enforced: {model_id}")

    elif policy == "allowlist":
        configs = await repo.get_active_for_org(org.id)
        allowed = [c.modelId for c in configs]
        if not allowed:
            from fastapi import HTTPException
            raise HTTPException(status_code=422, detail={
                "error": "no_model_configured",
                "message": "No models are on your org's allowlist.",
                "hint": "Go to Models in the Orch dashboard and add at least one model."
            })
        if requested_model != "auto" and requested_model not in allowed:
            raise ModelNotAllowedError(requested_model, allowed)
        model_id = _resolve_auto(requested_model, org, allowed)
        logger.debug(f"Model from allowlist: {model_id}")

    else:
        model_id = _resolve_auto(requested_model, org, [])
        logger.debug(f"Model open policy: {model_id}")

    # --- Resolve API key ---

    if developer_model_key and policy != "enforced":
        # Under allowlist: developer can supply their own key but model must still be on the allowlist
        if policy == "allowlist":
            configs = await repo.get_active_for_org(org.id)
            allowed = [c.modelId for c in configs]
            if model_id not in allowed:
                raise ModelNotAllowedError(model_id, allowed)
        logger.info(f"Using developer personal key model={model_id} policy={policy}")
        primary = {
            "model_id": model_id,
            "endpoint": None,
            "api_key": developer_model_key,
            "display_name": model_id,
            "context_window": None,
            "key_source": "developer_personal"
        }
    else:
        config = await repo.get_by_model_id(org.id, model_id)
        if config:
            primary = {
                "model_id": config.modelId,
                "endpoint": config.endpoint,
                "api_key": decrypt_key(config.encryptedKey) if config.encryptedKey else None,
                "display_name": config.displayName,
                "context_window": config.contextWindow,
                "key_source": "team_config"
            }
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=422, detail={
                "error": "no_model_configured",
                "message": "No model is configured for your org.",
                "hint": "Go to Models in the Orch dashboard and add a model with an API key."
            })

    # --- Build fallback chain ---
    primary["fallback_configs"] = await _build_fallbacks(org, repo, exclude=model_id)

    return primary


async def _build_fallbacks(org, repo: ModelConfigRepository, exclude: str) -> list[dict]:
    fallback_ids = getattr(org, "fallbackModelIds", []) or []

    if fallback_ids:
        ids_to_fetch = [fid for fid in fallback_ids if fid != exclude]
        configs = await asyncio.gather(*[
            repo.get_by_model_id(org.id, fid) for fid in ids_to_fetch
        ])
        return [
            {
                "model_id": c.modelId,
                "endpoint": c.endpoint,
                "api_key": decrypt_key(c.encryptedKey) if c.encryptedKey else None,
            }
            for c in configs if c
        ]

    all_configs = await repo.get_active_for_org(org.id)
    return [
        {
            "model_id": c.modelId,
            "endpoint": c.endpoint,
            "api_key": decrypt_key(c.encryptedKey) if c.encryptedKey else None,
        }
        for c in all_configs if c.modelId != exclude
    ]


def _resolve_auto(requested: str, org, allowed: list[str]) -> str:
    if requested != "auto":
        return requested
    # Use org's explicit default if set
    default_id = getattr(org, "defaultModelId", None)
    if default_id:
        if not allowed or default_id in allowed:
            return default_id
    # Fall back to first allowed or global default
    return allowed[0] if allowed else _default(org)


def _default(org=None) -> str:
    return settings.default_model
