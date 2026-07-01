import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

CONFIG_PATH = Path.home() / ".orch" / "config.json"


@dataclass
class AgentConfig:
    api_key: str = ""
    api_url: str = "http://127.0.0.1:8000"
    watch_paths: list[str] = field(default_factory=list)

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)


def load_config() -> AgentConfig:
    if not CONFIG_PATH.exists():
        return AgentConfig()
    try:
        data = json.loads(CONFIG_PATH.read_text())
        return AgentConfig(
            api_key=data.get("api_key", ""),
            api_url=data.get("api_url", "http://127.0.0.1:8000"),
            watch_paths=data.get("watch_paths", []),
        )
    except Exception as e:
        logger.warning(f"Failed to load config: {e}")
        return AgentConfig()


def save_config(config: AgentConfig) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps({
        "api_key": config.api_key,
        "api_url": config.api_url,
        "watch_paths": config.watch_paths,
    }, indent=2))


def add_watch_path(path: str) -> None:
    config = load_config()
    if path not in config.watch_paths:
        config.watch_paths.append(path)
        save_config(config)
        logger.info(f"Watch path added: {path}")


def remove_watch_path(path: str) -> None:
    config = load_config()
    if path in config.watch_paths:
        config.watch_paths.remove(path)
        save_config(config)
        logger.info(f"Watch path removed: {path}")
