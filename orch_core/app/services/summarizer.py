import litellm
from app.config import get_settings
from app.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

_SUMMARIZE_INSTRUCTION = (
    "You are a conversation summarizer. Summarize the following conversation history "
    "into a concise paragraph that preserves all key technical decisions, code patterns, "
    "and context a developer would need to continue the conversation. "
    "Be specific about technologies, variable names, and architectural decisions mentioned. "
    "Output only the summary, no preamble."
)


async def summarize_history(
    turns: list[dict],
    model_id: str,
    api_key: str | None = None,
    endpoint: str | None = None
) -> str:
    """
    Summarizes a list of conversation turns into a single compact paragraph.
    Uses the cheapest/fastest available model for cost efficiency.
    """
    if not turns:
        return ""

    conversation_text = "\n".join(
        f"{t['role'].upper()}: {t['content']}" for t in turns
    )

    kwargs: dict = {
        "model": settings.router_model,  # use cheap router model, not the main model
        "messages": [
            {"role": "system", "content": _SUMMARIZE_INSTRUCTION},
            {"role": "user", "content": conversation_text}
        ],
        "max_tokens": 500,
        "temperature": 0.0
    }
    if api_key:
        kwargs["api_key"] = api_key
    if endpoint:
        kwargs["api_base"] = endpoint

    try:
        response = await litellm.acompletion(**kwargs)
        summary = response.choices[0].message.content or ""
        logger.debug(f"History summarized turns={len(turns)} summary_len={len(summary)}")
        return summary
    except Exception as e:
        logger.warning(f"Summarization failed, using truncation fallback: {e}")
        # Fallback: just return the last turn as plain text
        last = turns[-1]
        return f"[Previous context truncated] Last message: {last['content'][:200]}"
