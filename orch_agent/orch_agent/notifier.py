import logging
import platform
import subprocess

logger = logging.getLogger(__name__)


def notify(title: str, message: str, urgency: str = "normal") -> None:
    """Send a desktop notification. Cross-platform. Never raises."""
    system = platform.system()
    try:
        if system == "Darwin":
            subprocess.run(
                ["osascript", "-e", f'display notification "{message}" with title "{title}"'],
                check=False, timeout=5,
            )
        elif system == "Linux":
            level = "critical" if urgency == "critical" else "normal"
            subprocess.run(
                ["notify-send", "-u", level, title, message],
                check=False, timeout=5,
            )
        elif system == "Windows":
            from win10toast import ToastNotifier  # type: ignore
            ToastNotifier().show_toast(title, message, duration=8, threaded=True)
    except Exception as e:
        logger.debug(f"Desktop notification failed: {e}")


def notify_issues(filename: str, issues: list[dict]) -> None:
    critical = [i for i in issues if i.get("severity") == "critical"]
    warnings = [i for i in issues if i.get("severity") == "warning"]

    if critical:
        count = len(critical)
        msg = f"{count} critical issue{'s' if count > 1 else ''}"
        if warnings:
            msg += f", {len(warnings)} warning{'s' if len(warnings) > 1 else ''}"
        notify(f"Orch — {filename} [CRITICAL]", msg, urgency="critical")
    elif warnings:
        count = len(warnings)
        notify(f"Orch — {filename} [WARNING]", f"{count} warning{'s' if count > 1 else ''}")
    else:
        notify(f"Orch — {filename}", f"{len(issues)} suggestion{'s' if len(issues) > 1 else ''}")
