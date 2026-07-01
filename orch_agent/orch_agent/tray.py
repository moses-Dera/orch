import logging
import threading
from pathlib import Path

logger = logging.getLogger(__name__)


def _make_icon():
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (64, 64), color="#0f172a")
    draw = ImageDraw.Draw(img)
    draw.ellipse([8, 8, 56, 56], fill="#6366f1")
    draw.text((22, 18), "O", fill="white")
    return img


def _add_folder(icon, item) -> None:
    import tkinter as tk
    from tkinter import filedialog
    from orch_agent.config import add_watch_path

    root = tk.Tk()
    root.withdraw()
    folder = filedialog.askdirectory(title="Select folder to watch")
    root.destroy()
    if folder:
        add_watch_path(folder)


def _remove_folder(icon, item) -> None:
    import tkinter as tk
    from tkinter import simpledialog
    from orch_agent.config import load_config, remove_watch_path

    config = load_config()
    paths = config.watch_paths
    if not paths:
        return

    root = tk.Tk()
    root.withdraw()
    choice = simpledialog.askstring(
        "Remove folder",
        "Current paths:\n" + "\n".join(f"{i+1}. {p}" for i, p in enumerate(paths)) +
        "\n\nEnter number to remove:"
    )
    root.destroy()

    if choice and choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(paths):
            remove_watch_path(paths[idx])


def _show_status(icon, item) -> None:
    import tkinter as tk
    from tkinter import simpledialog
    from orch_agent.config import load_config

    config = load_config()
    root = tk.Tk()
    root.withdraw()
    simpledialog.askstring(
        "Orch Agent Status",
        f"API Key: {'✓ set' if config.is_configured else '✗ not set'}\n"
        f"API URL: {config.api_url}\n"
        f"Watching {len(config.watch_paths)} folder(s):\n" +
        ("\n".join(config.watch_paths) if config.watch_paths else "None") +
        "\n\n(press OK to close)"
    )
    root.destroy()


def _quit(icon, item) -> None:
    icon.stop()


def start_tray(stop_event: threading.Event) -> None:
    try:
        import pystray
        from pystray import MenuItem as Item
    except ImportError:
        logger.warning("pystray not installed — running without system tray")
        stop_event.wait()
        return

    try:
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
                Item("Quit", _quit),
            ),
        )
        icon.run()
    except Exception as e:
        logger.error(f"Tray error: {e}")
    finally:
        stop_event.set()
