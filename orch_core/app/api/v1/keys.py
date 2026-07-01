import secrets
from fastapi import APIRouter
from typing import Optional
from app.models.schemas import GenerateKeyResponse
from app.db.client import db

router = APIRouter()


@router.post("/generate", response_model=GenerateKeyResponse, summary="Generate a new API key for a team")
async def generate_key(
    team_id: str,
    member_id: Optional[str] = None,
    label: str = "default"
):
    """
    Generates a new API key for a team.
    Optionally link to a specific member (developer) for per-developer attribution.
    """
    key = f"orch_{secrets.token_urlsafe(32)}"
    await db.apikey.create(data={
        "key": key,
        "teamId": team_id,
        "memberId": member_id,
        "label": label
    })
    return GenerateKeyResponse(
        key=key,
        hint="Store this key securely. It will not be shown again."
    )
