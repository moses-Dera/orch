# Contributing to orch-agent

## Setup

```bash
pip install -e ".[dev]"
orch login
orch-agent
```

## Structure

```
orch_agent/          ← Python package
├── agent.py         ← entry point, thread orchestration
├── config.py        ← config dataclass
├── watcher.py       ← file system observer
├── analyzer.py      ← orch_core API calls
├── alert.py         ← tkinter alert window
├── notifier.py      ← desktop notifications
└── tray.py          ← system tray
main.py              ← python main.py entry point
```

## Pull requests

- All imports within the package must use `from orch_agent.x import y`
- Never use `print()` — use `logging.getLogger(__name__)`
- tkinter must only be imported inside functions, never at module level
- Test on macOS and Linux before submitting

## Reporting security issues

Email: security@orch.dev
