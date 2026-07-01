import pytest
from app.core.constraint_loader import _pick_variant

BASE = "base constraint"
GPT_VARIANT = "gpt variant"
CLAUDE_VARIANT = "claude variant"
GEMINI_VARIANT = "gemini variant"

DATA = {
    "constraints": BASE,
    "gptVariant": GPT_VARIANT,
    "claudeVariant": CLAUDE_VARIANT,
    "geminiVariant": GEMINI_VARIANT,
    "version": "1.0"
}


def test_picks_gpt_variant():
    assert _pick_variant(DATA, "gpt-4o") == GPT_VARIANT

def test_picks_claude_variant():
    assert _pick_variant(DATA, "claude-3-5-sonnet") == CLAUDE_VARIANT

def test_picks_gemini_variant():
    assert _pick_variant(DATA, "gemini/gemini-1.5-pro") == GEMINI_VARIANT

def test_falls_back_to_base_for_unknown_model():
    assert _pick_variant(DATA, "llama-3-70b") == BASE

def test_falls_back_when_variant_is_none():
    data = {**DATA, "gptVariant": None}
    assert _pick_variant(data, "gpt-4o") == BASE
