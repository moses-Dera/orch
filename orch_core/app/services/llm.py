import hashlib
import json
import litellm
from typing import AsyncGenerator
from app.logging import get_logger
from app.services.cache import _get_redis

litellm.drop_params = True
litellm.set_verbose = False
litellm.redact_messages = False  # we handle redaction ourselves

logger = get_logger(__name__)

_CACHE_TTL = 3600  # 1 hour


def _safe_error(e: Exception) -> str:
    """Strip API keys from error messages before logging or returning to client."""
    msg = str(e)
    # litellm errors often contain 'api_key=sk-...' or 'Authorization: Bearer sk-...'
    import re
    msg = re.sub(r'(api[_-]?key[=:\s]+)[\w\-]+', r'\1[REDACTED]', msg, flags=re.IGNORECASE)
    msg = re.sub(r'(Bearer\s+)[\w\-]+', r'\1[REDACTED]', msg, flags=re.IGNORECASE)
    msg = re.sub(r'(sk-|AIza|ant-)[\w\-]+', '[REDACTED]', msg)
    return msg

_CACHE_TTL = 3600  # 1 hour


# --- Cache helpers ---

def _cache_key(model_id: str, system_instruction: str, last_user_message: str) -> str:
    raw = f"{model_id}::{system_instruction}::{last_user_message}"
    return "orch:response:" + hashlib.sha256(raw.encode()).hexdigest()


async def _get_cached(key: str) -> tuple[str, int, int] | None:
    r = await _get_redis()
    if not r:
        return None
    try:
        cached = await r.get(key)
        if cached:
            data = json.loads(cached)
            logger.debug(f"Response cache hit key={key[:20]}...")
            return data["text"], data["input_tokens"], data["output_tokens"]
    except Exception:
        pass
    return None


async def _set_cached(key: str, text: str, input_tokens: int, output_tokens: int):
    r = await _get_redis()
    if not r:
        return
    try:
        await r.setex(key, _CACHE_TTL, json.dumps({
            "text": text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        }))
    except Exception:
        pass


# --- Core LLM call ---

def _build_kwargs(model_id: str, messages: list[dict], system_instruction: str,
                  api_key: str | None, endpoint: str | None) -> dict:
    kwargs: dict = {
        "model": model_id,
        "messages": [{"role": "system", "content": system_instruction}] + messages,
        "max_retries": 2,
    }
    if endpoint:
        kwargs["api_base"] = endpoint
    if api_key:
        kwargs["api_key"] = api_key
    return kwargs


async def complete(
    model_id: str,
    messages: list[dict],
    system_instruction: str,
    api_key: str | None = None,
    endpoint: str | None = None,
    fallback_configs: list[dict] | None = None,
    use_cache: bool = True,
) -> tuple[str, int, int]:
    """
    Unified LLM completion via litellm.
    Supports response caching and automatic fallback to alternative models.
    Returns (response_text, input_tokens, output_tokens).
    """
    last_user_message = messages[-1]["content"] if messages else ""

    # Check cache first
    if use_cache:
        cache_key = _cache_key(model_id, system_instruction, last_user_message)
        cached = await _get_cached(cache_key)
        if cached:
            return cached

    # Try primary model
    kwargs = _build_kwargs(model_id, messages, system_instruction, api_key, endpoint)
    try:
        response = await litellm.acompletion(**kwargs)
        text = response.choices[0].message.content or ""
        input_tokens = getattr(response.usage, "prompt_tokens", 0)
        output_tokens = getattr(response.usage, "completion_tokens", 0)
        logger.debug(f"LLM complete model={model_id} in={input_tokens} out={output_tokens}")

        if use_cache:
            await _set_cached(cache_key, text, input_tokens, output_tokens)

        return text, input_tokens, output_tokens

    except Exception as primary_error:
        logger.warning(f"Primary model failed model={model_id} error={_safe_error(primary_error)}")

        # Try fallback chain
        if fallback_configs:
            for fb in fallback_configs:
                fb_model = fb.get("model_id", "")
                logger.info(f"Trying fallback model={fb_model}")
                try:
                    fb_kwargs = _build_kwargs(
                        fb_model, messages, system_instruction,
                        fb.get("api_key"), fb.get("endpoint")
                    )
                    response = await litellm.acompletion(**fb_kwargs)
                    text = response.choices[0].message.content or ""
                    input_tokens = getattr(response.usage, "prompt_tokens", 0)
                    output_tokens = getattr(response.usage, "completion_tokens", 0)
                    logger.info(f"Fallback succeeded model={fb_model}")
                    return text, input_tokens, output_tokens
                except Exception as fb_error:
                    logger.warning(f"Fallback failed model={fb_model} error={_safe_error(fb_error)}")
                    continue

        logger.error(f"All models failed primary={model_id}")
        raise RuntimeError(f"All models failed. Please check your API key and model configuration.")


async def complete_stream(
    model_id: str,
    messages: list[dict],
    system_instruction: str,
    api_key: str | None = None,
    endpoint: str | None = None,
    fallback_configs: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Streaming LLM completion via litellm.
    Yields text chunks as they arrive from the model.
    Falls back to non-streaming on failure.
    """
    kwargs = _build_kwargs(model_id, messages, system_instruction, api_key, endpoint)
    kwargs["stream"] = True

    try:
        response = await litellm.acompletion(**kwargs)
        async for chunk in response:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content
    except Exception as primary_error:
        logger.warning(f"Streaming failed model={model_id} error={_safe_error(primary_error)}")

        if fallback_configs:
            for fb in fallback_configs:
                fb_model = fb.get("model_id", "")
                logger.info(f"Trying streaming fallback model={fb_model}")
                try:
                    fb_kwargs = _build_kwargs(
                        fb_model, messages, system_instruction,
                        fb.get("api_key"), fb.get("endpoint")
                    )
                    fb_kwargs["stream"] = True
                    response = await litellm.acompletion(**fb_kwargs)
                    async for chunk in response:
                        delta = chunk.choices[0].delta
                        if delta and delta.content:
                            yield delta.content
                    return
                except Exception as fb_error:
                    logger.warning(f"Streaming fallback failed model={fb_model} error={_safe_error(fb_error)}")
                    continue

        raise RuntimeError(f"All streaming models failed. Please check your API key and model configuration.")
