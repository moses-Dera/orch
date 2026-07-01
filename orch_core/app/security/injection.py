import re
import unicodedata
from uuid import uuid4

# Covers direct, unicode-obfuscated, and encoded injection attempts
_INJECTION_PATTERNS = [
    # Instruction override attempts
    r"ignore\s+(all\s+)?(previous\s+|above\s+)?instructions",
    r"disregard\s+(all\s+)?(previous\s+|above\s+)?instructions",
    r"forget\s+(all\s+)?(previous\s+|above\s+)?instructions",
    r"override\s+(all\s+)?(previous\s+|above\s+)?instructions",
    r"bypass\s+(all\s+)?(previous\s+|above\s+)?instructions",
    r"do\s+not\s+follow\s+(your\s+)?instructions",
    # Persona hijacking
    r"you\s+are\s+now\s+",
    r"act\s+as\s+(if\s+you\s+are|a\s+)",
    r"pretend\s+(you\s+are|to\s+be)",
    r"roleplay\s+as",
    r"from\s+now\s+on\s+(you\s+are|act)",
    # System prompt extraction
    r"reveal\s+(your\s+|the\s+)?(system\s+)?prompt",
    r"print\s+(your\s+|the\s+)?(system\s+)?prompt",
    r"show\s+(your\s+|the\s+)?(system\s+)?prompt",
    r"repeat\s+(your\s+|the\s+)?(system\s+)?prompt",
    r"what\s+(are|were)\s+your\s+instructions",
    r"output\s+(your\s+|the\s+)?(system\s+)?prompt",
    r"display\s+(your\s+|the\s+)?(system\s+)?prompt",
    # Jailbreak markers
    r"\[system\]",
    r"\[assistant\]",
    r"\[user\]",
    r"<\s*system\s*>",
    r"###\s*instruction",
    r"###\s*system",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]


def _normalize(text: str) -> str:
    """Normalize unicode to catch lookalike character attacks."""
    return unicodedata.normalize("NFKC", text)


def scan_for_injection(prompt: str) -> bool:
    normalized = _normalize(prompt)
    return any(p.search(normalized) for p in _COMPILED)


def generate_canary() -> str:
    """Unique token embedded in every system instruction to detect leaks."""
    return f"[ORCH-CANARY-{uuid4().hex[:12].upper()}]"


def check_canary_leak(response: str, canary: str) -> bool:
    return canary in response
