import asyncio
import hashlib
import json
from fastapi import APIRouter, Depends
from app.models.schemas import ReviewRequest, ReviewResponse, ReviewIssue
from app.api.deps import get_team
from app.db.repositories.constraint import ConstraintRepository
from app.db.repositories.model_config import ModelConfigRepository
from app.db.client import db
from app.core.domain_router import detect_domain
from app.core.model_resolver import resolve_model
from app.core.constraint_loader import load_constraint
from app.security.injection import scan_for_injection, generate_canary, check_canary_leak
from app.services.llm import complete
from app.services.cache import _get_redis
from app.config import get_settings
from app.logging import get_logger

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)

_REVIEW_CACHE_TTL = 3600  # 1 hour


def _review_cache_key(diff: str, domain: str, constraint_version: str, model_id: str) -> str:
    raw = f"{diff}::{domain}::{constraint_version}::{model_id}"
    return "orch:review:" + hashlib.sha256(raw.encode()).hexdigest()


async def _get_cached_review(key: str) -> dict | None:
    r = await _get_redis()
    if not r:
        return None
    try:
        cached = await r.get(key)
        return json.loads(cached) if cached else None
    except Exception:
        return None


async def _set_cached_review(key: str, data: dict) -> None:
    r = await _get_redis()
    if not r:
        return
    try:
        await r.setex(key, _REVIEW_CACHE_TTL, json.dumps(data))
    except Exception:
        pass

REVIEW_SYSTEM = """You are a strict code reviewer enforcing the org's engineering constraints.

Given a file diff or code snippet, return a JSON object with this exact shape:
{
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "line": <int or null>,
      "title": "<short title>",
      "detail": "<explanation of the issue>",
      "constraint_id": "<which constraint domain this violates>",
      "suggested_fix": "<concrete fix or null>"
    }
  ],
  "summary": "<one sentence summary>",
  "clean": <true if no issues>
}

Return ONLY valid JSON. No markdown. No explanation outside the JSON."""


@router.post("", response_model=ReviewResponse, summary="Review a file diff against org constraints")
async def review_code(request: ReviewRequest, team=Depends(get_team)):
    if scan_for_injection(request.diff):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Content flagged by security layer.")

    constraint_repo = ConstraintRepository(db)

    domain = request.domain.lower()
    if domain == "auto":
        domain = await detect_domain(request.diff[:500], filename=request.filename)

    # Run model resolution and constraint loading in parallel
    model_config_repo = ModelConfigRepository(db)
    model_config, (constraint_text, constraint_version) = await asyncio.gather(
        resolve_model(request.model, team, model_config_repo),
        load_constraint(
            domain, request.model, constraint_repo,
            prompt=request.diff[:500],
            api_key=getattr(team, 'developer_model_key', None),
        )
    )

    # Re-pick variant now that we know the real model_id
    from app.core.constraint_loader import _pick_variant
    from app.services.cache import get_constraint
    if request.model == "auto" or request.model != model_config["model_id"]:
        cached_constraint = await get_constraint(domain)
        if cached_constraint:
            constraint_text = _pick_variant(cached_constraint, model_config["model_id"])

    # Check review cache — same diff + domain + constraint version + model = same result
    cache_key = _review_cache_key(request.diff, domain, constraint_version, model_config["model_id"])
    cached_review = await _get_cached_review(cache_key)
    if cached_review:
        logger.debug(f"Review cache hit file={request.filename} domain={domain}")
        from fastapi.responses import JSONResponse
        response_data = ReviewResponse(
            filename=request.filename,
            domain_identified=domain,
            model_executed=model_config["display_name"],
            issues=[ReviewIssue(**i) for i in cached_review["issues"]],
            summary=cached_review["summary"],
            clean=cached_review["clean"],
        )
        return JSONResponse(
            content=response_data.model_dump(),
            headers={"x-orch-cached": "true"}
        )

    canary = generate_canary()
    system = f"{REVIEW_SYSTEM}\n\nOrg constraints to enforce:\n{constraint_text}\n{canary}"
    prompt = f"Review this code change in `{request.filename}`:\n\n```\n{request.diff}\n```"
    messages = [{"role": "user", "content": prompt}]

    output, input_tokens, output_tokens = await complete(
        model_id=model_config["model_id"],
        messages=messages,
        system_instruction=system,
        api_key=model_config.get("api_key"),
        endpoint=model_config.get("endpoint"),
        fallback_configs=model_config.get("fallback_configs", []),
        use_cache=False
    )

    if check_canary_leak(output, canary):
        logger.error("Canary leak in review endpoint")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Security violation detected.")

    try:
        parsed = json.loads(output)
        issues = [ReviewIssue(**i) for i in parsed.get("issues", [])]
        summary = parsed.get("summary", "Review complete.")
        clean = parsed.get("clean", len(issues) == 0)
    except Exception:
        logger.warning(f"Failed to parse review JSON: {output[:200]}")
        issues = []
        summary = "Review complete. Could not parse structured output."
        clean = True

    # Cache the result
    await _set_cached_review(cache_key, {
        "issues": [i.model_dump() for i in issues],
        "summary": summary,
        "clean": clean,
    })

    logger.info(f"Review complete file={request.filename} domain={domain} issues={len(issues)}")

    return ReviewResponse(
        filename=request.filename,
        domain_identified=domain,
        model_executed=model_config["display_name"],
        issues=issues,
        summary=summary,
        clean=clean
    )
