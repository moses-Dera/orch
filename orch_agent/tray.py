import threading
import asyncio
from pathlib import Path
from tkinter import filedialog, simpledialog
import tkinter as tk
from config import get_watch_paths, save_watch_paths, get_api_key, load_config
import json

try:
    import pystray
    from pystray import MenuItem as Item
    from PIL import Image, ImageDraw
    HAS_TRAY = True
except ImportError:
    HAS_TRAY = False


def _make_icon():
    """Generate a simple tray icon."""
    img = Image.new("RGB", (64, 64), color="#0f172a")
    draw = ImageDraw.Draw(img)
    draw.ellipse([8, 8, 56, 56], fill="#3b82f6")
    draw.text((22, 18), "O", fill="white")
    return img


def _add_folder(icon, item):
    root = tk.Tk()
    root.withdraw()
    folder = filedialog.askdirectory(title="Select folder to watch")
    root.destroy()
    if folder:
        paths = get_watch_paths()
        if folder not in paths:
            paths.append(folder)
            save_watch_paths(paths)
            print(f"[orch-agent] Added watch path: {folder}")


def _remove_folder(icon, item):
    paths = get_watch_paths()
    if not paths:
        return
    root = tk.Tk()
    root.withdraw()
    choice = simpledialog.askstring(
        "Remove folder",
        f"Current paths:\n" + "\n".join(f"{i+1}. {p}" for i, p in enumerate(paths)) +
        "\n\nEnter number to remove:"
    )
    root.destroy()
    if choice and choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(paths):
            removed = paths.pop(idx)
            save_watch_paths(paths)
            print(f"[orch-agent] Removed: {removed}")


def _show_status(icon, item):
    cfg = load_config()
    api_key = cfg.get("api_key", "")
    paths = get_watch_paths()
    root = tk.Tk()
    root.withdraw()
    simpledialog.askstring(
        "Orch Agent Status",
        f"API Key: {'✓ set' if api_key else '✗ not set'}\n"
        f"Watching {len(paths)} folder(s):\n" +
        ("\n".join(paths) if paths else "None") +
        "\n\n(press OK to close)"
    )
    root.destroy()


def _quit(icon, item):
    icon.stop()


def start_tray(stop_event: threading.Event):
    if not HAS_TRAY:
        print("[orch-agent] pystray not available. Running without tray icon.")
        stop_event.wait()
        return

    icon = pystray.Icon(
        "orch",
        _make_icon(),
        "Orch Agent",
        menu=pystray.Menu(
            Item("Orch Agent", lambda i, it: None, enabled=False),
            pystray.Menu.SEPARATOR,
            Item("Add watch folder", _add_folder),
            Item("Remove watch folder", _remove_folder),
            Item("Status", _show_status),
            pystray.Menu.SEPARATOR,
            Item("Quit", _quit)
        )
    )

    def on_stop():
        stop_event.set()

    icon.run(setup=lambda i: None)
    stop_event.set()
