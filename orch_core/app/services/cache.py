import json
import asyncio
from app.config import get_settings
from app.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

_redis = None
_redis_lock = asyncio.Lock()


async def _get_redis():
    global _redis
    if _redis is not None:
        return _redis
    async with _redis_lock:
        if _redis is not None:  # re-check after acquiring lock
            return _redis
        try:
            import redis.asyncio as redis
            client = redis.from_url(settings.redis_url)
            await client.ping()
            _redis = client
            logger.info("Redis connected")
        except Exception as e:
            logger.warning(f"Redis unavailable, caching disabled: {e}")
            _redis = None
    return _redis


async def get_constraint(domain: str) -> dict | None:
    r = await _get_redis()
    if not r:
        return None
    try:
        cached = await r.get(f"orch:constraint:{domain}")
        return json.loads(cached) if cached else None
    except Exception:
        return None


async def set_constraint(domain: str, data: dict, ttl: int = 300):
    r = await _get_redis()
    if not r:
        return
    try:
        await r.setex(f"orch:constraint:{domain}", ttl, json.dumps(data))
    except Exception:
        pass


async def invalidate_constraint(domain: str):
    r = await _get_redis()
    if not r:
        return
    try:
        await r.delete(f"orch:constraint:{domain}")
    except Exception:
        pass
