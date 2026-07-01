import httpx
import subprocess
from pathlib import Path
from config import get_api_key, get_api_url

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs",
    ".java", ".cs", ".php", ".rb", ".kt", ".swift", ".c", ".cpp"
}


def get_diff(filepath: str) -> str | None:
    """Get git diff for the file. Falls back to full file content if not in a git repo."""
    try:
        result = subprocess.run(
            ["git", "diff", "HEAD", filepath],
            capture_output=True, text=True,
            cwd=str(Path(filepath).parent)
        )
        if result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass

    # fallback — send full file content
    try:
        content = Path(filepath).read_text(encoding="utf-8", errors="ignore")
        if content.strip():
            return content[:8000]  # cap at 8K chars
    except Exception:
        pass

    return None


def should_review(filepath: str) -> bool:
    return Path(filepath).suffix.lower() in SUPPORTED_EXTENSIONS


async def analyze_file(filepath: str) -> dict | None:
    if not should_review(filepath):
        return None

    diff = get_diff(filepath)
    if not diff:
        return None

    api_key = get_api_key()
    if not api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{get_api_url()}/api/v1/review",
                json={
                    "filename": Path(filepath).name,
                    "diff": diff,
                    "domain": "auto",
                    "model": "auto"
                },
                headers={"Authorization": f"Bearer {api_key}"}
            )
            r.raise_for_status()
            return r.json()
    except httpx.ConnectError:
        return None
    except Exception as e:
        print(f"[orch-agent] Review error: {e}")
        return None
