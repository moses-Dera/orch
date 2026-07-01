import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.rate_limiter import check_rate_limit
from app.models.errors import RateLimitExceededError


@pytest.mark.asyncio
async def test_rate_limit_allows_under_limit():
    mock_pipe = AsyncMock()
    mock_pipe.execute = AsyncMock(return_value=[None, 5, None, None])  # count=5

    mock_redis = AsyncMock()
    mock_redis.pipeline = MagicMock(return_value=mock_pipe)

    with patch("app.services.rate_limiter._get_redis", return_value=mock_redis):
        # Should not raise — 5 requests under free limit of 10
        await check_rate_limit("orch_testkey123", "free")


@pytest.mark.asyncio
async def test_rate_limit_blocks_over_limit():
    mock_pipe = AsyncMock()
    mock_pipe.execute = AsyncMock(return_value=[None, 10, None, None])  # count=10, at limit

    mock_redis = AsyncMock()
    mock_redis.pipeline = MagicMock(return_value=mock_pipe)
    mock_redis.zrange = AsyncMock(return_value=[("ts", 1000.0)])

    with patch("app.services.rate_limiter._get_redis", return_value=mock_redis):
        with pytest.raises(RateLimitExceededError) as exc:
            await check_rate_limit("orch_testkey123", "free")
        assert exc.value.limit == 10


@pytest.mark.asyncio
async def test_rate_limit_degrades_gracefully_without_redis():
    with patch("app.services.rate_limiter._get_redis", return_value=None):
        # Should not raise when Redis is unavailable
        await check_rate_limit("orch_testkey123", "free")


@pytest.mark.asyncio
async def test_pro_tier_has_higher_limit():
    mock_pipe = AsyncMock()
    mock_pipe.execute = AsyncMock(return_value=[None, 55, None, None])  # count=55

    mock_redis = AsyncMock()
    mock_redis.pipeline = MagicMock(return_value=mock_pipe)

    with patch("app.services.rate_limiter._get_redis", return_value=mock_redis):
        # 55 requests should pass for pro tier (limit=60)
        await check_rate_limit("orch_testkey123", "pro")
