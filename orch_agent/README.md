# orch-agent

> Background file watcher for Orch — reviews code on every save, for any IDE.

Works with VS Code, Cursor, JetBrains, Neovim, Zed, or any editor.

---

## How it works

1. Runs as a background process in your system tray
2. Watches configured folders for file saves
3. On every save, diffs the changed file and sends it to `orch_core` for review
4. If issues are found, shows a desktop notification
5. Click the notification → alert window with findings, suggested fixes, and one-click apply

---

## Install

```bash
pip install orch-agent
```

Or from source:

```bash
cd orch_agent
pip install -e .
```

---

## Setup

```bash
# Log in first (shared config with orch-cli)
orch login

# Start the agent
orch-agent
```

On first run, use the system tray icon to add folders to watch.

---

## System tray menu

- **Add watch folder** — select a project folder to watch
- **Remove watch folder** — stop watching a folder
- **Status** — show current config and watched paths
- **Quit** — stop the agent

---

## Requirements

- Python 3.10+
- `orch_core` running and reachable
- Orch API key (`orch login`)
- macOS, Linux, or Windows

---

## License

MIT
