import tiktoken
from app.config import get_settings
from app.services.summarizer import summarize_history
from app.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


def _count_tokens(text: str) -> int:
    """Count tokens using tiktoken cl100k_base encoding."""
    try:
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        return len(text) // 4  # rough fallback: ~4 chars per token


def _count_message_tokens(messages: list[dict]) -> int:
    return sum(_count_tokens(m["content"]) for m in messages)


async def build_context(
    history: list,
    current_prompt: str,
    system_instruction: str,
    model_id: str,
    model_config: dict
) -> list[dict]:
    """
    Builds the conversation context that fits within the model's token budget.

    Context window priority:
    1. model_config["context_window"] — set by admin in dashboard when adding the model
    2. settings.context_window_default — fallback (128K, configurable via .env)

    Admins set the context window once when adding a model.
    No model names are hardcoded here.
    """
    context_window = model_config.get("context_window") or settings.context_window_default

    # Calculate available budget for history
    system_tokens = _count_tokens(system_instruction)
    prompt_tokens = _count_tokens(current_prompt)
    reserved = system_tokens + prompt_tokens + settings.context_budget_output
    history_budget = context_window - reserved

    if history_budget <= 0:
        logger.warning(f"No budget left for history model={model_id} reserved={reserved} window={context_window}")
        return [{"role": "user", "content": current_prompt}]

    # Convert history to message dicts
    all_messages = [
        {"role": "assistant" if msg.role == "model" else msg.role, "content": msg.content}
        for msg in history
    ]

    if not all_messages:
        return [{"role": "user", "content": current_prompt}]

    # Fit messages from most recent backwards
    fitting_messages = []
    tokens_used = 0
    cutoff_index = len(all_messages)

    for i in range(len(all_messages) - 1, -1, -1):
        msg_tokens = _count_tokens(all_messages[i]["content"])
        if tokens_used + msg_tokens <= history_budget:
            fitting_messages.insert(0, all_messages[i])
            tokens_used += msg_tokens
            cutoff_index = i
        else:
            break

    older_messages = all_messages[:cutoff_index]

    # If there are older messages that did not fit, summarize them
    if older_messages:
        logger.info(
            f"Context window: summarizing {len(older_messages)} older turns, "
            f"keeping {len(fitting_messages)} recent turns "
            f"model={model_id} budget={history_budget} used={tokens_used}"
        )
        summary = await summarize_history(
            older_messages,
            model_id=model_id,
            api_key=model_config.get("api_key"),
            endpoint=model_config.get("endpoint")
        )
        if summary:
            summary_message = {
                "role": "user",
                "content": f"[Earlier conversation summary]: {summary}"
            }
            summary_tokens = _count_tokens(summary)
            if tokens_used + summary_tokens <= history_budget:
                fitting_messages.insert(0, summary_message)
                logger.debug(f"Summary prepended tokens={summary_tokens}")
            else:
                logger.debug("Summary too large to fit, skipping")
    else:
        logger.debug(
            f"Context window: all {len(fitting_messages)} turns fit "
            f"model={model_id} tokens_used={tokens_used}/{history_budget}"
        )

    fitting_messages.append({"role": "user", "content": current_prompt})
    return fitting_messages
