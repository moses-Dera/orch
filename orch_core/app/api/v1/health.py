from fastapi import APIRouter, Depends
from app.models.schemas import OverrideRequest
from app.api.deps import get_team
from app.db.client import db
from app.db.repositories.health import ConstraintOverrideRepository, ConstraintHealthRepository
from app.core.health_scorer import get_status_label, get_recommendation
from app.workers.health_worker import schedule_health_recompute

router = APIRouter(prefix="/health", tags=["health"])


@router.post("/override", summary="Log a constraint override")
async def log_override(request: OverrideRequest, team=Depends(get_team)):
    """
    Called when a developer chooses to override a constraint suggestion.
    Logs the override with their stated reason and triggers health recomputation.
    """
    repo = ConstraintOverrideRepository(db)
    await repo.create(
        constraint_id=request.constraint_id,
        session_id=request.session_id,
        model_used=request.model_used,
        reason=request.reason
    )
    # Recompute health score in background
    await schedule_health_recompute(request.constraint_id, team.orgId)
    return {"status": "logged", "message": "Override recorded. Thank you for the feedback."}


@router.get("/scores", summary="Get constraint health scores for your org")
async def get_health_scores(team=Depends(get_team)):
    """
    Returns health scores for all constraint profiles in the org.
    Scores below 80 include recommendations for improvement.
    """
    health_repo = ConstraintHealthRepository(db)
    override_repo = ConstraintOverrideRepository(db)

    scores = await health_repo.get_all_for_org(team.orgId)

    result = []
    for s in scores:
        recent_overrides = await override_repo.get_recent(s.constraintId, limit=5)
        recent_reasons = [o.reason for o in recent_overrides]
        status = get_status_label(s.healthScore)
        recommendation = get_recommendation(s.constraintId, s.overrideRate, recent_reasons)

        result.append({
            "constraint_id": s.constraintId,
            "health_score": s.healthScore,
            "override_rate": s.overrideRate,
            "total_requests": s.totalRequests,
            "total_overrides": s.totalOverrides,
            "status": status,
            "recommendation": recommendation,
            "last_computed": s.lastComputed.isoformat()
        })

    return {
        "org": team.org.name,
        "scores": result,
        "summary": {
            "total_constraints": len(result),
            "healthy": sum(1 for s in result if s["status"] == "healthy"),
            "warning": sum(1 for s in result if s["status"] == "warning"),
            "critical": sum(1 for s in result if s["status"] == "critical")
        }
    }
