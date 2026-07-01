"""
Orch Agent — background file watcher for any IDE.

Watches configured folders for file saves, reviews changes against
your org's constraints, and shows desktop alerts with findings.
"""
import asyncio
import logging
import queue
import sys
import threading

from orch_agent.config import load_config
from orch_agent.watcher import start_watcher, get_alert_queue
from orch_agent.alert import show_alert
from orch_agent.tray import start_tray

logger = logging.getLogger(__name__)


def _setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [orch-agent] %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )


def _run_event_loop(loop: asyncio.AbstractEventLoop, watch_paths: list[str]) -> None:
    """Runs the asyncio event loop in a background thread."""
    asyncio.set_event_loop(loop)
    observer = start_watcher(loop, watch_paths)
    loop.run_forever()
    if observer:
        observer.stop()
        observer.join()


def _drain_alerts(stop_event: threading.Event) -> None:
    """Drains the alert queue on the main thread (tkinter requirement)."""
    alert_q = get_alert_queue()
    while not stop_event.is_set():
        try:
            filepath, review = alert_q.get(timeout=0.5)
            show_alert(filepath, review)
        except queue.Empty:
            continue


def main() -> None:
    _setup_logging()

    config = load_config()
    if not config.is_configured:
        logger.error("No API key found. Run `orch login` first.")
        sys.exit(1)

    logger.info("Starting Orch Agent...")

    loop = asyncio.new_event_loop()
    stop_event = threading.Event()

    # Event loop runs in background thread
    loop_thread = threading.Thread(
        target=_run_event_loop,
        args=(loop, config.watch_paths),
        daemon=True,
        name="orch-event-loop",
    )
    loop_thread.start()

    # Alert drainer runs in background thread (feeds main thread via queue)
    alert_thread = threading.Thread(
        target=_drain_alerts,
        args=(stop_event,),
        daemon=True,
        name="orch-alert-drainer",
    )
    alert_thread.start()

    logger.info("Running. Check your system tray.")

    # Tray must run on main thread (macOS requirement)
    start_tray(stop_event)

    # Shutdown
    stop_event.set()
    loop.call_soon_threadsafe(loop.stop)
    logger.info("Stopped.")


if __name__ == "__main__":
    main()
