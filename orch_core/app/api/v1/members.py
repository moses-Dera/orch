from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.api.deps import get_team
from app.db.client import db
from app.db.repositories.member import MemberRepository
from app.db.repositories.invite import InviteRepository

router = APIRouter()


class InviteRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    role: str = Field(default="member")

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        if v not in {"owner", "admin", "member", "viewer"}:
            raise ValueError("Invalid role.")
        return v


class AcceptInviteRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=64)
    clerk_id: str = Field(..., min_length=1, max_length=128)
    name: Optional[str] = Field(default=None, max_length=128)


@router.get("", summary="List team members")
async def list_members(team=Depends(get_team)):
    repo = MemberRepository(db)
    members = await repo.get_all_for_team(team.id)
    return {
        "team": team.name,
        "members": [
            {
                "id": m.id,
                "email": m.email,
                "name": m.name,
                "role": m.role,
                "last_active": m.lastActiveAt.isoformat() if m.lastActiveAt else None,
            }
            for m in members
        ]
    }


@router.post("/invite", summary="Invite a member to the team")
async def invite_member(request: InviteRequest, team=Depends(get_team)):
    member_repo = MemberRepository(db)
    existing = await member_repo.get_by_email(request.email, team.id)
    if existing:
        raise HTTPException(status_code=409, detail={
            "error": "already_member",
            "message": f"{request.email} is already a member of this team."
        })

    invite_repo = InviteRepository(db)
    resolved_member = getattr(team, "resolved_member", None)
    invite = await invite_repo.create(
        email=request.email,
        role=request.role,
        team_id=team.id,
        org_id=team.orgId,
        invited_by=resolved_member.id if resolved_member else None
    )
    return {
        "token": invite.token,
        "email": invite.email,
        "expires_at": invite.expiresAt.isoformat(),
        "hint": f"Send this invite link: /onboarding?token={invite.token}"
    }


@router.post("/accept-invite", summary="Accept an invite and create member record")
async def accept_invite(request: AcceptInviteRequest):
    invite_repo = InviteRepository(db)
    invite = await invite_repo.get_by_token(request.token)

    if not invite:
        raise HTTPException(status_code=404, detail={"error": "invalid_token", "message": "Invite not found."})
    if invite.accepted:
        raise HTTPException(status_code=409, detail={"error": "already_accepted", "message": "Invite already used."})

    from datetime import datetime
    if invite.expiresAt < datetime.utcnow():
        raise HTTPException(status_code=410, detail={"error": "expired", "message": "Invite has expired."})

    member_repo = MemberRepository(db)
    member = await member_repo.create(
        email=invite.email,
        role=invite.role,
        team_id=invite.teamId,
        clerk_id=request.clerk_id,
        name=request.name
    )
    await invite_repo.accept(request.token)

    return {
        "member_id": member.id,
        "email": member.email,
        "role": member.role,
        "team": invite.team.name,
        "org": invite.team.org.name
    }
