import time
from app.services.cache import _get_redis
from app.models.errors import RateLimitExceededError
from app.config import get_settings
from app.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

# Tier -> requests per minute
TIER_LIMITS: dict[str, int] = {
    "free":       settings.rate_limit_free,
    "pro":        settings.rate_limit_pro,
    "business":   settings.rate_limit_business,
    "enterprise": settings.rate_limit_enterprise,
}

WINDOW_SECONDS = 60


async def check_rate_limit(api_key: str, tier: str):
    """
    Sliding window rate limiter using Redis.
    Raises RateLimitExceededError if the limit is exceeded.
    Degrades gracefully if Redis is unavailable.
    """
    r = await _get_redis()
    if not r:
        # Redis unavailable — allow request, log warning
        logger.warning(f"Rate limiter skipped (Redis unavailable) key={api_key[:12]}...")
        return

    limit = TIER_LIMITS.get(tier, settings.rate_limit_free)
    key = f"orch:ratelimit:{api_key}"
    now = time.time()
    window_start = now - WINDOW_SECONDS

    try:
        pipe = r.pipeline()
        # Remove entries outside the current window
        await pipe.zremrangebyscore(key, 0, window_start)
        # Count requests in current window
        await pipe.zcard(key)
        # Add current request timestamp
        await pipe.zadd(key, {str(now): now})
        # Set expiry so keys clean themselves up
        await pipe.expire(key, WINDOW_SECONDS * 2)
        results = await pipe.execute()

        current_count = results[1]

        if current_count >= limit:
            # Calculate seconds until oldest entry falls outside window
            oldest = await r.zrange(key, 0, 0, withscores=True)
            reset_in = int(WINDOW_SECONDS - (now - oldest[0][1])) if oldest else WINDOW_SECONDS
            logger.warning(f"Rate limit exceeded key={api_key[:12]}... tier={tier} count={current_count} limit={limit}")
            raise RateLimitExceededError(limit=limit, reset_in=reset_in)

        logger.debug(f"Rate limit ok key={api_key[:12]}... tier={tier} count={current_count + 1}/{limit}")

    except RateLimitExceededError:
        raise
    except Exception as e:
        # Redis error — allow request, do not block
        logger.error(f"Rate limiter error: {e}")
