"""
Orch Agent — background file watcher for any IDE.

Usage:
    python agent.py

On first run, use the tray icon to add folders to watch.
Requires an Orch API key saved in ~/.orch/config.json (run `orch login` from the CLI).
"""
import asyncio
import threading
import sys
import queue
from config import get_api_key


def main():
    api_key = get_api_key()
    if not api_key:
        print("[orch-agent] No API key found. Run `orch login` first.")
        sys.exit(1)

    print("[orch-agent] Starting...")

    loop = asyncio.new_event_loop()
    stop_event = threading.Event()

    def run_loop():
        asyncio.set_event_loop(loop)
        from watcher import start_watcher
        start_watcher(loop)
        loop.run_forever()

    loop_thread = threading.Thread(target=run_loop, daemon=True)
    loop_thread.start()

    print("[orch-agent] Running. Check your system tray.")

    # Drain alert queue on main thread (tkinter must run here)
    def drain_alerts():
        from watcher import get_alert_queue
        from alert import show_alert
        q = get_alert_queue()
        while not stop_event.is_set():
            try:
                filepath, review = q.get(timeout=0.5)
                show_alert(filepath, review)
            except queue.Empty:
                continue

    alert_thread = threading.Thread(target=drain_alerts, daemon=True)
    alert_thread.start()

    # Tray runs on main thread (required on macOS)
    from tray import start_tray
    start_tray(stop_event)

    stop_event.set()
    loop.call_soon_threadsafe(loop.stop)
    print("[orch-agent] Stopped.")


if __name__ == "__main__":
    main()
