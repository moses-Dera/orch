# Contributing to orch-review-action

## Setup

```bash
npm install
npm run build
```

The compiled action is in `dist/index.js`. This file must be committed — GitHub Actions runs it directly.

## Testing locally

Point `api_url` at a local `orch_core` instance:

```yaml
- uses: ./
  with:
    api_key: ${{ secrets.ORCH_API_KEY }}
    api_url: http://localhost:8000
```

## Pull requests

- Run `npm run build` before submitting — `dist/` must be up to date
- Run `npx tsc --noEmit` to check types
- Keep the action fast — it runs on every PR

## Reporting security issues

Email: security@orch.dev
