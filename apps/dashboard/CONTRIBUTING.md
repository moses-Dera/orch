# Contributing to orch_dashboard

## Setup

```bash
npm install

cp .env.local.example .env.local
# Edit .env.local — set Clerk keys and ORCH_API_URL

npm run dev
```

Dashboard: `http://localhost:3000`

## Requirements

- Node.js 18+
- A running `orch_core` instance
- Clerk account (free tier works)

## Pull requests

- Keep PRs focused
- Run `npm run build` before submitting to catch type errors
- All pages must work in both light and dark mode
- Admin-only pages must be protected by `RouteGuard`

## Reporting security issues

See [SECURITY.md](SECURITY.md).
