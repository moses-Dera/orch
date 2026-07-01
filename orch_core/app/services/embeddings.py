import hashlib
import json
import litellm
from app.config import get_settings
from app.services.cache import _get_redis
from app.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

_EMBEDDING_MODEL = "text-embedding-3-small"  # 1536 dims, cheap, fast
_CACHE_TTL = 86400  # 24 hours


def _cache_key(text: str) -> str:
    return "orch:embed:" + hashlib.sha256(text.encode()).hexdigest()


async def _get_cached(key: str) -> list[float] | None:
    r = await _get_redis()
    if not r:
        return None
    try:
        cached = await r.get(key)
        return json.loads(cached) if cached else None
    except Exception:
        return None


async def _set_cached(key: str, embedding: list[float]) -> None:
    r = await _get_redis()
    if not r:
        return
    try:
        await r.setex(key, _CACHE_TTL, json.dumps(embedding))
    except Exception:
        pass


async def embed(text: str, api_key: str | None = None) -> list[float]:
    """
    Embed a single text string.
    Returns a list of floats (1536 dimensions).
    Caches result in Redis to avoid re-embedding identical text.
    """
    key = _cache_key(text)
    cached = await _get_cached(key)
    if cached:
        return cached

    try:
        response = await litellm.aembedding(
            model=_EMBEDDING_MODEL,
            input=[text],
            api_key=api_key or settings.gemini_api_key or None,
        )
        embedding = response.data[0]["embedding"]
        await _set_cached(key, embedding)
        return embedding
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise


async def embed_batch(texts: list[str], api_key: str | None = None) -> list[list[float]]:
    """
    Embed multiple texts in one API call.
    Returns list of embeddings in the same order as input.
    """
    if not texts:
        return []

    # Check cache for each
    results: list[list[float] | None] = []
    uncached_indices: list[int] = []
    uncached_texts: list[str] = []

    for i, text in enumerate(texts):
        key = _cache_key(text)
        cached = await _get_cached(key)
        if cached:
            results.append(cached)
        else:
            results.append(None)
            uncached_indices.append(i)
            uncached_texts.append(text)

    if uncached_texts:
        try:
            response = await litellm.aembedding(
                model=_EMBEDDING_MODEL,
                input=uncached_texts,
                api_key=api_key or settings.gemini_api_key or None,
            )
            for j, idx in enumerate(uncached_indices):
                embedding = response.data[j]["embedding"]
                results[idx] = embedding
                await _set_cached(_cache_key(uncached_texts[j]), embedding)
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            raise

    return [r for r in results if r is not None]
