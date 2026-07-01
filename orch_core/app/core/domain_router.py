import litellm
from app.config import get_settings
from app.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

_INSTRUCTION = (
    "Classify the following engineering prompt into exactly one of these domains: "
    "'backend', 'cyber', 'blockchain', or 'general'. Output ONLY the single word."
)
_DOMAINS = ["backend", "cyber", "blockchain"]

# File extension → domain mapping
# When a filename is provided, check this before calling the LLM
_EXTENSION_MAP: dict[str, str] = {
    # Blockchain
    ".sol": "blockchain",
    ".vy": "blockchain",   # Vyper
    ".move": "blockchain",

    # Cyber / Infrastructure
    ".tf": "cyber",
    ".hcl": "cyber",
    ".nix": "cyber",

    # Backend (explicit — most files fall here)
    ".py": "backend",
    ".go": "backend",
    ".rs": "backend",
    ".java": "backend",
    ".kt": "backend",
    ".cs": "backend",
    ".rb": "backend",
    ".php": "backend",
    ".ts": "backend",
    ".tsx": "backend",
    ".js": "backend",
    ".jsx": "backend",
    ".swift": "backend",
    ".cpp": "backend",
    ".c": "backend",
    ".h": "backend",
}

# Filename patterns that suggest cyber/security domain
_SECURITY_PATTERNS = [
    "auth", "oauth", "jwt", "token", "secret", "crypt", "cipher",
    "password", "credential", "permission", "policy", "firewall",
    "nginx", "apache", "ssl", "tls", "cert", "key",
]


def _heuristic_domain(filename: str | None) -> str | None:
    """
    Returns a domain based on file extension or name patterns.
    Returns None if no confident match — caller should use LLM detection.
    """
    if not filename:
        return None

    # Normalise
    name = filename.lower().split("/")[-1]  # basename only

    # Check extension
    for ext, domain in _EXTENSION_MAP.items():
        if name.endswith(ext):
            # Override backend → cyber for security-related filenames
            if domain == "backend":
                stem = name.rsplit(".", 1)[0]
                if any(p in stem for p in _SECURITY_PATTERNS):
                    return "cyber"
            return domain

    # YAML/JSON infra files
    if name.endswith((".yml", ".yaml", ".json")):
        if any(p in name for p in ["docker", "k8s", "helm", "terraform", "ansible", "nginx", "security"]):
            return "cyber"

    return None


async def detect_domain(prompt: str, filename: str | None = None) -> str:
    """
    Detects the domain for a prompt.

    First tries a file extension heuristic (free — no tokens).
    Falls back to a fast LLM classification call if heuristic is inconclusive.
    """
    # Try heuristic first — zero token cost
    heuristic = _heuristic_domain(filename)
    if heuristic:
        logger.debug(f"Domain from heuristic: {heuristic} (file={filename})")
        return heuristic

    # Fall back to LLM classification
    try:
        response = await litellm.acompletion(
            model=settings.router_model,
            api_key=settings.gemini_api_key or None,
            messages=[
                {"role": "system", "content": _INSTRUCTION},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,
            max_tokens=10
        )
        classification = response.choices[0].message.content.strip().lower()
        for domain in _DOMAINS:
            if domain in classification:
                logger.debug(f"Domain from LLM: {domain}")
                return domain
    except Exception as e:
        logger.warning(f"Domain detection failed, defaulting to general: {e}")

    return "general"
