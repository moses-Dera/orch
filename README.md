# Orch

> Governance over all AI, regardless of source.

---

## What It Is

Orch is a governance layer that sits between your developers and any AI they use. It doesn't replace their tools. It enforces your org's engineering standards on every line of AI-assisted code — automatically, without changing how developers work.

**Developers use any AI they want. Every commit is reviewed. Every session is attributed. The CTO sees everything.**

---

## Structure

```
orch/
├── orch_core/        FastAPI backend — the governance engine
├── orch_dashboard/   Next.js web dashboard — org, team, and constraint management
├── orch_extension/   VS Code extension — silent background constraint enforcement
├── orch_action/      GitHub Action — automated PR reviews on every push
└── orch_cli/         Developer CLI — orch ask, orch audit, orch init
```

Each project is independent. All communicate through the `orch_core` REST API.

---

## orch_core

The engine. Handles everything:

- Prompt interception and constraint enforcement
- Multi-tenant org, team, and member management — one person can belong to multiple orgs
- Model policy: Enforced / Allowlist / Open
- Developer personal API keys — used per-request, never stored
- Session memory with smart context window management and summarization
- Streaming responses with automatic model fallback chain
- Code review against org constraints with structured findings
- Constraint health scoring and override tracking
- Per-developer audit log, session drill-down, and cost attribution
- Rate limiting, injection defense, canary tokens, and credential encryption

```bash
cd orch_core
pip install -r requirements.txt
prisma generate && prisma db push
python seed.py
uvicorn main:app --reload
```

API docs: `http://127.0.0.1:8000/docs`

---

## orch_dashboard

Web dashboard for CTOs and admins. **Built and functional.**

- Sign up / sign in via Clerk — login only, all product data owned by Orch
- Onboarding wizard — create org, set model policy, get API key
- Multi-org support — one account, multiple orgs, switch instantly from the header
- Org switcher — dropdown in header, switch context in one click
- Home — getting started checklist for new teams, stats and activity for active teams
- Chat — streaming AI chat with org constraints applied
- Audit — code review against org constraints with structured findings
- Sessions — personal conversation history with full message thread drill-down
- Team — invite members, manage roles (owner / admin / member / viewer)
- Constraints — create, edit, delete constraint profiles with per-model variants and sandbox
- Models — add/remove models with encrypted API keys, policy display
- Audit Log — per-developer drill-down: click any developer, see all their sessions and messages
- Analytics — token usage and session charts by developer
- Docs — built-in documentation for developers and admins
- Settings — API key display, Clerk profile
- Dark mode — system preference detected, toggle in header, persisted

```bash
cd orch_dashboard
npm install
# configure .env.local — NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ORCH_API_URL, ORCH_API_KEY
npm run dev
```

Dashboard: `http://localhost:3000`

---

## orch_extension

VS Code extension for developers. **Partially built.**

Built:
- Extension scaffold with activation
- Status bar showing active constraint profile
- Config resolution — reads `.orch/config` from workspace root
- API client connected to orch_core

In progress:
- Auto-configuration from git remote via `resolve-repo` endpoint
- Silent background constraint enforcement on AI completions
- Right-click audit on any file

---

## orch_action

GitHub Action for automated PR reviews. **In progress.**

Planned behaviour:
- Triggers on every PR and push
- Fetches the PR diff from GitHub
- Reviews each changed file against org constraints in parallel
- Posts findings as inline PR review comments with exact line numbers
- Posts a summary comment with issue count by severity
- Blocks merge on critical findings (configurable)
- Writes audit events to orch_core for compliance trail

Usage (once built):
```yaml
- uses: orch/review-action@v1
  with:
    api_key: ${{ secrets.ORCH_API_KEY }}
```

---

## orch_cli

Developer CLI. **Built and functional.**

```bash
cd orch_cli
pip install -r requirements.txt

orch login                          # save API key
orch ask "how do I..."              # streaming prompt
orch audit ./src/auth.py            # review a file
orch chat                           # interactive session
orch models                         # list approved models
orch status                         # org and team info
orch health                         # constraint health scores
```

`orch init` — coming soon. Detects git remote, registers repo against org, installs pre-commit hook. Zero developer action after that.

---

## Documentation

Full documentation at the repo root:

- `DOCUMENTATION.md` — architecture, API reference, setup guide, security
- `TODO.md` — feature backlog and progress tracker
- `INVESTOR_PITCH.md` — problem, solution, market, ask
- `FUNDING_STRATEGY.md` — funding path and action plan
- `GO_TO_MARKET.md` — ICP, buyer journey, GTM plan
