import asyncio
import logging
import queue
import time
from pathlib import Path

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from orch_agent.analyzer import analyze_file, should_review
from orch_agent.notifier import notify_issues

logger = logging.getLogger(__name__)

DEBOUNCE_SECONDS = 2.0

# Queue for passing alerts to the main thread (tkinter must run on main thread)
_alert_queue: queue.Queue = queue.Queue()
_last_event: dict[str, float] = {}


class OrchFileHandler(FileSystemEventHandler):
    def __init__(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def on_modified(self, event) -> None:
        if event.is_directory:
            return

        filepath = event.src_path
        if not should_review(filepath):
            return

        now = time.monotonic()
        if now - _last_event.get(filepath, 0) < DEBOUNCE_SECONDS:
            return
        _last_event[filepath] = now

        asyncio.run_coroutine_threadsafe(self._handle(filepath), self._loop)

    async def _handle(self, filepath: str) -> None:
        logger.debug(f"Reviewing {Path(filepath).name}")
        review = await analyze_file(filepath)
        if not review or review.get("clean"):
            return

        issues = review.get("issues", [])
        if not issues:
            return

        notify_issues(Path(filepath).name, issues)
        _alert_queue.put((filepath, review))
        logger.info(f"Found {len(issues)} issue(s) in {Path(filepath).name}")


def start_watcher(loop: asyncio.AbstractEventLoop, watch_paths: list[str]) -> Observer | None:
    if not watch_paths:
        logger.warning("No watch paths configured. Use the tray menu to add folders.")
        return None

    handler = OrchFileHandler(loop)
    observer = Observer()

    for path in watch_paths:
        if Path(path).exists():
            observer.schedule(handler, path, recursive=True)
            logger.info(f"Watching: {path}")
        else:
            logger.warning(f"Watch path not found, skipping: {path}")

    observer.start()
    return observer


def get_alert_queue() -> queue.Queue:
    return _alert_queue
