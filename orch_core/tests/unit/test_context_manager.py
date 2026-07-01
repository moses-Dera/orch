import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from app.core.context_manager import _count_tokens, build_context


def make_message(role: str, content: str):
    msg = MagicMock()
    msg.role = role
    msg.content = content
    return msg


def test_count_tokens_returns_positive():
    assert _count_tokens("Hello world") > 0


def test_count_tokens_longer_text_has_more_tokens():
    short = _count_tokens("Hi")
    long = _count_tokens("This is a much longer sentence with many more words in it.")
    assert long > short


@pytest.mark.asyncio
async def test_build_context_empty_history():
    messages = await build_context(
        history=[],
        current_prompt="How do I write a FastAPI endpoint?",
        system_instruction="You are a senior engineer.",
        model_id="gpt-4o",
        model_config={"api_key": None, "endpoint": None, "context_window": 128000}
    )
    assert messages[-1]["role"] == "user"
    assert "FastAPI" in messages[-1]["content"]
    assert len(messages) == 1


@pytest.mark.asyncio
async def test_build_context_small_history_fits_without_summary():
    history = [
        make_message("user", "Write a hello world function"),
        make_message("model", "def hello(): return 'Hello World'"),
    ]
    messages = await build_context(
        history=history,
        current_prompt="Now add a name parameter",
        system_instruction="You are a senior engineer.",
        model_id="gpt-4o",
        model_config={"api_key": None, "endpoint": None, "context_window": 128000}
    )
    assert len(messages) == 3
    assert messages[-1]["content"] == "Now add a name parameter"


@pytest.mark.asyncio
async def test_build_context_uses_db_context_window():
    """Context window from model_config (DB) takes priority over any default."""
    history = [
        make_message("user", "word " * 100),
        make_message("model", "word " * 100),
    ]
    messages = await build_context(
        history=history,
        current_prompt="What was discussed?",
        system_instruction="You are a senior engineer.",
        model_id="some-custom-internal-model",
        model_config={"api_key": None, "endpoint": None, "context_window": 100}
    )
    assert messages[-1]["content"] == "What was discussed?"


@pytest.mark.asyncio
async def test_build_context_large_history_triggers_summary():
    history = [
        make_message("user", "word " * 500),
        make_message("model", "word " * 500),
        make_message("user", "word " * 500),
        make_message("model", "word " * 500),
        make_message("user", "recent question"),
        make_message("model", "recent answer"),
    ]
    mock_summary = "Earlier the developer asked about word repetition patterns."
    with patch("app.core.context_manager.summarize_history", new=AsyncMock(return_value=mock_summary)):
        messages = await build_context(
            history=history,
            current_prompt="What was discussed?",
            system_instruction="You are a senior engineer.",
            model_id="gpt-4o",
            model_config={"api_key": None, "endpoint": None, "context_window": 500}
        )
    contents = [m["content"] for m in messages]
    assert any("Earlier conversation summary" in c for c in contents)
    assert messages[-1]["content"] == "What was discussed?"
