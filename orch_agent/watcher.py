import asyncio
import time
import queue
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from analyzer import analyze_file, should_review
from notifier import notify_issues
from config import get_watch_paths

# Debounce — avoid firing multiple times on rapid saves
_last_event: dict[str, float] = {}
DEBOUNCE_SECONDS = 2.0

# Queue for passing alerts to the main thread (tkinter requirement)
_alert_queue: queue.Queue = queue.Queue()


class OrchFileHandler(FileSystemEventHandler):
    def __init__(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    def on_modified(self, event):
        if event.is_directory:
            return
        filepath = event.src_path
        if not should_review(filepath):
            return

        now = time.time()
        last = _last_event.get(filepath, 0)
        if now - last < DEBOUNCE_SECONDS:
            return
        _last_event[filepath] = now

        asyncio.run_coroutine_threadsafe(self._handle(filepath), self.loop)

    async def _handle(self, filepath: str):
        print(f"[orch-agent] Reviewing {Path(filepath).name}...")
        review = await analyze_file(filepath)
        if review and not review.get("clean"):
            issues = review.get("issues", [])
            if issues:
                notify_issues(Path(filepath).name, issues)
                # Queue alert for main thread — tkinter must run on main thread
                _alert_queue.put((filepath, review))


def start_watcher(loop: asyncio.AbstractEventLoop) -> Observer:
    paths = get_watch_paths()
    if not paths:
        print("[orch-agent] No watch paths configured. Use the tray menu to add folders.")
        return None

    handler = OrchFileHandler(loop)
    observer = Observer()
    for path in paths:
        if Path(path).exists():
            observer.schedule(handler, path, recursive=True)
            print(f"[orch-agent] Watching: {path}")
        else:
            print(f"[orch-agent] Path not found, skipping: {path}")

    observer.start()
    return observer


def get_alert_queue() -> queue.Queue:
    return _alert_queue
