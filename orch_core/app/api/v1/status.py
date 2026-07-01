from fastapi import APIRouter, Depends
from app.models.schemas import StatusResponse, ConstraintProfile
from app.db.client import db
from app.api.deps import get_team

router = APIRouter()


@router.get("", response_model=StatusResponse, summary="Get org and team status")
async def get_status(team=Depends(get_team)):
    constraints = await db.domainconstraint.find_many()
    return StatusResponse(
        org=team.org.name,
        team=team.name,
        model_policy=team.org.modelPolicy,
        enforced_model=team.org.enforcedModel,
        constraint_profiles=[
            ConstraintProfile(id=c.id, description=c.description, version=c.version)
            for c in constraints
        ]
    )
