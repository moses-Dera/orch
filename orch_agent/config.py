import json
from pathlib import Path

CONFIG_PATH = Path.home() / ".orch" / "config.json"


def load_config() -> dict:
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text())
        except Exception:
            return {}
    return {}


def get_api_key() -> str:
    return load_config().get("api_key", "")


def get_api_url() -> str:
    return load_config().get("api_url", "http://127.0.0.1:8000")


def get_watch_paths() -> list[str]:
    return load_config().get("watch_paths", [])


def save_watch_paths(paths: list[str]):
    cfg = load_config()
    cfg["watch_paths"] = paths
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2))
