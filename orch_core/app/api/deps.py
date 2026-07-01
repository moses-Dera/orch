from fastapi import Depends, HTTPException, Header, Request
from typing import Optional
import asyncio
from app.db.client import db
from app.services.rate_limiter import check_rate_limit


async def get_team(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    developer_model_key: Optional[str] = Header(None, alias="X-Model-API-Key"),
    clerk_user_id: Optional[str] = Header(None, alias="X-Clerk-User-Id"),
):
    """
    Resolves team and member from Authorization: Bearer orch_<key> header.
    When X-Clerk-User-Id is present (dashboard requests), also resolves
    the specific member record for per-developer attribution.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={
            "error": "missing_api_key",
            "message": "Authorization header required. Format: Bearer orch_<key>",
            "hint": "Get your key from the Orch dashboard under Settings."
        })

    api_key = authorization.removeprefix("Bearer ").strip()

    if not api_key.startswith("orch_"):
        raise HTTPException(status_code=401, detail={
            "error": "invalid_api_key_format",
            "message": "Invalid API key format. Orch keys start with orch_",
        })

    record = await db.apikey.find_unique(
        where={"key": api_key},
        include={"team": {"include": {"org": True}}, "member": True}
    )

    if not record or not record.isActive:
        raise HTTPException(status_code=401, detail={
            "error": "invalid_api_key",
            "message": "Invalid or inactive API key.",
            "hint": "Check your key in the Orch dashboard under Settings."
        })

    team = record.team

    # Member lookup and rate limit check are independent — run in parallel
    resolved_member = record.member
    if clerk_user_id and (not resolved_member or resolved_member.clerkId != clerk_user_id):
        resolved_member, _ = await asyncio.gather(
            db.member.find_first(where={"clerkId": clerk_user_id, "teamId": team.id}),
            check_rate_limit(api_key, team.org.tier)
        )
    else:
        await check_rate_limit(api_key, team.org.tier)

    team.resolved_member = resolved_member
    team.developer_model_key = developer_model_key

    return team
