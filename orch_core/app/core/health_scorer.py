from app.db.client import db
from app.db.repositories.health import ConstraintOverrideRepository, ConstraintHealthRepository
from app.db.repositories.constraint import ConstraintRepository
from app.logging import get_logger

logger = get_logger(__name__)

# Thresholds
OVERRIDE_RATE_WARNING = 20.0   # % — yellow flag
OVERRIDE_RATE_CRITICAL = 40.0  # % — red flag, constraint likely broken


def compute_health_score(total_requests: int, total_overrides: int) -> tuple[float, float]:
    """
    Computes override rate and health score.
    Returns (override_rate, health_score) both as 0-100 floats.

    Health score formula:
    - 0% override rate  -> 100 score
    - 20% override rate -> 80 score (warning threshold)
    - 40% override rate -> 50 score (critical threshold)
    - 100% override rate -> 0 score
    """
    if total_requests == 0:
        return 0.0, 100.0

    override_rate = (total_overrides / total_requests) * 100
    # Linear decay: health = 100 - override_rate
    health_score = max(0.0, 100.0 - override_rate)
    return round(override_rate, 2), round(health_score, 2)


def get_status_label(health_score: float) -> str:
    if health_score >= 80:
        return "healthy"
    if health_score >= 50:
        return "warning"
    return "critical"


def get_recommendation(constraint_id: str, override_rate: float, recent_reasons: list[str]) -> str | None:
    if override_rate < OVERRIDE_RATE_WARNING:
        return None
    if override_rate >= OVERRIDE_RATE_CRITICAL:
        reason_summary = f" Common reasons: {'; '.join(recent_reasons[:3])}." if recent_reasons else ""
        return (
            f"Constraint '{constraint_id}' has a {override_rate:.0f}% override rate — "
            f"developers are frequently bypassing it.{reason_summary} "
            f"Consider revising this constraint or splitting it into more specific rules."
        )
    return (
        f"Constraint '{constraint_id}' has a {override_rate:.0f}% override rate. "
        f"Monitor closely — it may need tuning."
    )


async def recompute_health(constraint_id: str, org_id: str):
    """
    Recomputes and persists the health score for a constraint/org pair.
    Called as a background task after each session.
    """
    override_repo = ConstraintOverrideRepository(db)
    health_repo = ConstraintHealthRepository(db)

    try:
        # Count total requests for this constraint in last 30 days
        # We approximate total requests as sessions that used this domain
        total_requests = await db.session.count(
            where={
                "teamId": {"not": None},
                "team": {"is": {"orgId": org_id}},
                "constraintVersion": {"not": None}
            }
        )

        total_overrides = await override_repo.count_for_constraint(constraint_id, org_id)
        override_rate, health_score = compute_health_score(total_requests, total_overrides)

        await health_repo.upsert(constraint_id, org_id, {
            "totalRequests": total_requests,
            "totalOverrides": total_overrides,
            "overrideRate": override_rate,
            "healthScore": health_score
        })

        logger.debug(
            f"Health recomputed constraint={constraint_id} org={org_id} "
            f"score={health_score} override_rate={override_rate}%"
        )

        if override_rate >= OVERRIDE_RATE_WARNING:
            logger.warning(
                f"Constraint health alert constraint={constraint_id} org={org_id} "
                f"override_rate={override_rate}% score={health_score}"
            )

    except Exception as e:
        logger.error(f"Health recompute failed constraint={constraint_id} org={org_id} error={e}")
