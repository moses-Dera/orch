# Contributing to orch-extension

## Setup

```bash
npm install
npm run compile
```

Press `F5` in VS Code to launch the extension in a debug window.

## Testing

1. Open a workspace with a `.orch/config` file containing your API key
2. Right-click any file → "Orch: Audit This File"
3. Findings appear as inline diagnostics

## Pull requests

- Run `npx tsc --noEmit` before submitting
- Test in both light and dark VS Code themes
- Commands must be registered in both `extension.ts` and `package.json`

## Reporting security issues

Email: security@orch.dev
