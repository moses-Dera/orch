# Contributing to orch-cli

## Setup

```bash
pip install -e ".[dev]"
orch login
```

## Pull requests

- Keep commands consistent with existing style (Typer + Rich)
- Test against a running `orch_core` instance
- All new commands must handle `ConnectError` gracefully

## Reporting security issues

Email: security@orch.dev
