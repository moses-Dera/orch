import platform
import subprocess


def notify(title: str, message: str, urgency: str = "normal"):
    """Send a desktop notification. Cross-platform."""
    system = platform.system()

    try:
        if system == "Darwin":
            subprocess.run([
                "osascript", "-e",
                f'display notification "{message}" with title "{title}"'
            ], check=False)

        elif system == "Linux":
            level = "critical" if urgency == "critical" else "normal"
            subprocess.run(
                ["notify-send", "-u", level, title, message],
                check=False
            )

        elif system == "Windows":
            from win10toast import ToastNotifier
            ToastNotifier().show_toast(title, message, duration=8, threaded=True)

    except Exception as e:
        print(f"[orch-agent] Notification error: {e}")


def notify_issues(filename: str, issues: list[dict]):
    critical = [i for i in issues if i["severity"] == "critical"]
    warnings = [i for i in issues if i["severity"] == "warning"]

    if critical:
        title = f"Orch - {filename} [CRITICAL]"
        msg = f"{len(critical)} critical issue{'s' if len(critical) > 1 else ''}"
        if warnings:
            msg += f", {len(warnings)} warning{'s' if len(warnings) > 1 else ''}"
        notify(title, msg, urgency="critical")
    elif warnings:
        title = f"Orch - {filename} [WARNING]"
        msg = f"{len(warnings)} warning{'s' if len(warnings) > 1 else ''}"
        notify(title, msg, urgency="normal")
    else:
        title = f"Orch - {filename}"
        msg = f"{len(issues)} suggestion{'s' if len(issues) > 1 else ''}"
        notify(title, msg, urgency="low")
