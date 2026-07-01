import asyncio
from app.core.health_scorer import recompute_health
from app.logging import get_logger

logger = get_logger(__name__)


def schedule_health_recompute(constraint_id: str, org_id: str):
    """
    Schedules a health recomputation as a background task.
    Does not block the API response.
    """
    asyncio.create_task(_run(constraint_id, org_id))


async def _run(constraint_id: str, org_id: str):
    try:
        await recompute_health(constraint_id, org_id)
    except Exception as e:
        logger.error(f"Health worker failed constraint={constraint_id} org={org_id} error={e}")
