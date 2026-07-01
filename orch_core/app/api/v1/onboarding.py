import secrets
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.db.client import db
from app.core.slugify import _slugify
from app.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


class CreateOrgRequest(BaseModel):
    clerk_id: str = Field(..., min_length=1, max_length=128)
    email: str = Field(..., min_length=3, max_length=254)
    name: Optional[str] = Field(default=None, max_length=128)
    org_name: str = Field(..., min_length=1, max_length=128)
    team_name: str = Field(default="Engineering", max_length=128)
    model_policy: str = Field(default="open")

    @field_validator("model_policy")
    @classmethod
    def valid_policy(cls, v: str) -> str:
        if v not in {"open", "allowlist", "enforced"}:
            raise ValueError("Invalid model policy.")
        return v

    @field_validator("org_name", "team_name")
    @classmethod
    def no_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Cannot be empty.")
        return v.strip()


class CreateIndividualRequest(BaseModel):
    clerk_id: str = Field(..., min_length=1, max_length=128)
    email: str = Field(..., min_length=3, max_length=254)
    name: Optional[str] = Field(default=None, max_length=128)


class RegisterRepoRequest(BaseModel):
    clerk_id: str = Field(..., min_length=1, max_length=128)
    org_id: str = Field(..., min_length=1, max_length=128)
    repo_url: str = Field(..., min_length=1, max_length=512)


def _member_payload(member, api_key) -> dict:
    return {
        "member_id": member.id,
        "email": member.email,
        "name": member.name,
        "role": member.role,
        "org": {
            "id": member.team.org.id,
            "name": member.team.org.name,
            "model_policy": member.team.org.modelPolicy,
            "tier": member.team.org.tier,
        },
        "team": {
            "id": member.team.id,
            "name": member.team.name,
        },
        "api_key": api_key.key if api_key else None,
    }


async def _create_org_for_clerk(clerk_id: str, email: str, name: Optional[str],
                                 org_name: str, team_name: str, model_policy: str) -> dict:
    """Shared logic — creates org + team + member + api key + billing in one transaction."""
    async with db.tx() as tx:
        org = await tx.organization.create(data={
            "name": org_name,
            "slug": _slugify(org_name),
            "ownerClerkId": clerk_id,
            "modelPolicy": model_policy,
            "tier": "free",
        })
        team = await tx.team.create(data={"name": team_name, "orgId": org.id})
        member = await tx.member.create(data={
            "clerkId": clerk_id,
            "email": email,
            "name": name,
            "role": "owner",
            "teamId": team.id,
        })
        key = f"orch_{secrets.token_urlsafe(32)}"
        await tx.apikey.create(data={
            "key": key, "label": "default",
            "teamId": team.id, "memberId": member.id,
        })
        await tx.billing.create(data={"orgId": org.id, "plan": "free", "status": "active"})

    return {"org_id": org.id, "org_name": org.name, "team_id": team.id,
            "member_id": member.id, "api_key": key}


@router.post("/create-org", summary="Create a new org — works for new and existing users")
async def create_org(request: CreateOrgRequest):
    # No longer blocks existing users — they can create additional orgs
    try:
        data = await _create_org_for_clerk(
            request.clerk_id, request.email, request.name,
            request.org_name, request.team_name, request.model_policy
        )
        logger.info(f"Org created org={data['org_id']} owner={request.email}")
        return {**data, "hint": "Store your API key securely. Use it in the VS Code extension, CLI, or Orch Agent."}
    except Exception as e:
        logger.error(f"Org creation failed: {e}")
        raise HTTPException(status_code=500, detail={
            "error": "creation_failed",
            "message": "Failed to create org. Please try again."
        })


@router.post("/create-individual", summary="Create a personal workspace")
async def create_individual(request: CreateIndividualRequest):
    display_name = request.name or request.email.split("@")[0]
    try:
        data = await _create_org_for_clerk(
            request.clerk_id, request.email, request.name,
            f"{display_name}'s Workspace", "Personal", "open"
        )
        logger.info(f"Individual workspace created org={data['org_id']} user={request.email}")
        return data
    except Exception as e:
        logger.error(f"Individual creation failed: {e}")
        raise HTTPException(status_code=500, detail={
            "error": "creation_failed",
            "message": "Failed to create workspace. Please try again."
        })


@router.get("/me", summary="Get all orgs for a clerk user")
async def get_me(clerk_id: str, org_id: Optional[str] = Query(None)):
    """
    Returns all orgs the user belongs to.
    If org_id is provided, returns that specific org as the active one.
    Otherwise returns the most recently joined org.
    """
    members = await db.member.find_many(
        where={"clerkId": clerk_id},
        include={"team": {"include": {"org": True}}, "apiKeys": {"where": {"isActive": True}}}
    )

    if not members:
        return {"onboarded": False}

    # Build list of all orgs this user belongs to
    orgs = []
    for m in members:
        api_key = m.apiKeys[0] if m.apiKeys else None
        orgs.append({
            "org_id": m.team.org.id,
            "org_name": m.team.org.name,
            "team_id": m.team.id,
            "team_name": m.team.name,
            "member_id": m.id,
            "role": m.role,
            "model_policy": m.team.org.modelPolicy,
            "tier": m.team.org.tier,
            "api_key": api_key.key if api_key else None,
        })

    # Determine active org — prefer requested org_id, else most recent
    active = next((o for o in orgs if o["org_id"] == org_id), orgs[0])

    return {
        "onboarded": True,
        "email": members[0].email,
        "name": members[0].name,
        "role": active["role"],
        "org": {
            "id": active["org_id"],
            "name": active["org_name"],
            "model_policy": active["model_policy"],
            "tier": active["tier"],
        },
        "team": {
            "id": active["team_id"],
            "name": active["team_name"],
        },
        "member_id": active["member_id"],
        "api_key": active["api_key"],
        "orgs": orgs,  # full list for the switcher
    }


@router.post("/register-repo", summary="Register a git remote URL against an org for auto-detection")
async def register_repo(request: RegisterRepoRequest):
    """
    Called by `orch init`. Associates a git remote URL with an org.
    The extension/CLI uses this to auto-detect the right API key for a repo.
    """
    member = await db.member.find_first(
        where={"clerkId": request.clerk_id, "team": {"is": {"orgId": request.org_id}}}
    )
    if not member:
        raise HTTPException(status_code=403, detail={
            "error": "forbidden",
            "message": "You are not a member of this org."
        })

    org = await db.organization.find_unique(where={"id": request.org_id})
    if not org:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Org not found."})

    existing = list(org.repoUrls or [])
    if request.repo_url not in existing:
        existing.append(request.repo_url)
        await db.organization.update(
            where={"id": request.org_id},
            data={"repoUrls": existing}
        )

    logger.info(f"Repo registered org={request.org_id} url={request.repo_url}")
    return {"registered": True, "repo_url": request.repo_url}


@router.get("/resolve-repo", summary="Resolve which org owns a git remote URL")
async def resolve_repo(repo_url: str, clerk_id: str):
    """
    Called by the extension/CLI on startup.
    Given a git remote URL, returns the matching org and API key.
    """
    members = await db.member.find_many(
        where={"clerkId": clerk_id},
        include={"team": {"include": {"org": True}}, "apiKeys": {"where": {"isActive": True}}}
    )

    for m in members:
        repo_urls = list(m.team.org.repoUrls or [])
        if repo_url in repo_urls or any(repo_url.startswith(r) for r in repo_urls):
            api_key = m.apiKeys[0] if m.apiKeys else None
            return {
                "matched": True,
                "org_id": m.team.org.id,
                "org_name": m.team.org.name,
                "api_key": api_key.key if api_key else None,
            }

    return {"matched": False}
