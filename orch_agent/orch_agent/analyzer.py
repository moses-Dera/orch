import logging
import subprocess
from pathlib import Path

import httpx

from orch_agent.config import load_config

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs",
    ".java", ".cs", ".php", ".rb", ".kt", ".swift", ".c", ".cpp",
    ".sol", ".vy",
}


def should_review(filepath: str) -> bool:
    return Path(filepath).suffix.lower() in SUPPORTED_EXTENSIONS


def get_diff(filepath: str) -> str | None:
    """Get git diff for the file. Falls back to full file content."""
    try:
        result = subprocess.run(
            ["git", "diff", "HEAD", filepath],
            capture_output=True, text=True,
            cwd=str(Path(filepath).parent),
            timeout=5,
        )
        if result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass

    try:
        content = Path(filepath).read_text(encoding="utf-8", errors="ignore")
        return content[:8000] if content.strip() else None
    except Exception as e:
        logger.warning(f"Could not read file {filepath}: {e}")
        return None


async def analyze_file(filepath: str) -> dict | None:
    """Send file diff to orch_core for review. Returns review result or None."""
    if not should_review(filepath):
        return None

    diff = get_diff(filepath)
    if not diff:
        return None

    config = load_config()
    if not config.is_configured:
        logger.warning("No API key configured — skipping review")
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{config.api_url}/api/v1/review",
                json={
                    "filename": Path(filepath).name,
                    "diff": diff,
                    "domain": "auto",
                    "model": "auto",
                },
                headers={"Authorization": f"Bearer {config.api_key}"},
            )
            response.raise_for_status()
            return response.json()

    except httpx.ConnectError:
        logger.debug(f"Cannot reach orch_core at {config.api_url}")
        return None
    except httpx.HTTPStatusError as e:
        logger.warning(f"Review API error {e.response.status_code} for {filepath}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error reviewing {filepath}: {e}")
        return None
