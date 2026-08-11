# Orch — Full Product Documentation

> Version: 3.0.0
> Status: Active Development
> Last Updated: 2025

---

## Table of Contents

1. [What Is Orch?](#1-what-is-orch)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Model Policy System](#6-model-policy-system)
7. [Multi-Org and Multi-Project Support](#7-multi-org-and-multi-project-support)
8. [GitHub App Integration](#8-github-app-integration)
9. [API Reference](#9-api-reference)
10. [Security](#10-security)
11. [Constraint Health System](#11-constraint-health-system)
12. [Performance](#12-performance)
13. [How to Run](#13-how-to-run)
14. [Environment Variables](#14-environment-variables)
15. [Tech Stack](#15-tech-stack)
16. [Roadmap](#16-roadmap)

---

## 1. What Is Orch?

Orch is a governance middleware layer that enforces your org's engineering standards on every line of AI-assisted code — regardless of which AI tool wrote it.

**It is not an AI tool. It is governance over AI tools.**

Developers use ChatGPT, Claude, Copilot, Cursor, or any AI they prefer. Orch doesn't interfere with that. It sits at the commit and PR boundary — reviewing every code change against the org's constraint profiles before it ships.

**In one sentence:**
> Governance over all AI, regardless of source.

### Who it's for

- **CTOs and VPs Engineering** — full visibility into AI usage, code quality, and compliance coverage across the team
- **Developers** — zero workflow change. Orch works in the background.

---

## 2. The Problem It Solves

Companies are letting developers use AI freely with no visibility, no standards, and no control.

- Developer A uses GPT-4 with a personal card — no oversight, no audit trail
- Developer B uses Claude with a shared team key nobody rotates
- Developer C ships AI-generated code that violates the company's security standards
- The CTO has no idea what models are being used, what's being asked, or what it's costing
- A contractor leaves — their AI access goes with them, the damage stays

**Orch solves this without changing how developers work.**

---

## 3. Architecture

### Request Flow (Chat / Prompt)

```
Developer prompt (CLI / VS Code / Dashboard)
              ↓
    POST /api/v1/orchestrate/stream
              ↓
    deps.py — API key lookup + member resolution + rate limit (parallel)
              ↓
    pipeline._prepare() — two parallel phases:
      Phase 1 (parallel):
        ├── session history lookup
        └── domain detection (fast LLM: backend / cyber / blockchain / general)
      Phase 2 (parallel):
        ├── model resolution (policy enforcement + key selection)
        └── constraint loading (Redis → DB → fallback)
              ↓
    build_context() — token budgeting, history summarization if needed
              ↓
    canary token injected into system instruction
              ↓
    LLM call via litellm (streaming or standard, automatic fallback chain)
              ↓
    canary leak check — block if system prompt leaked in output
              ↓
    SSE stream → developer
              ↓
    Background (non-blocking):
      ├── persist_turn() — save messages to DB
      └── schedule_health_recompute() — update constraint health score
```

### Review Flow (Code Audit)

```
Code diff (dashboard / CLI / GitHub Action)
              ↓
    POST /api/v1/review
              ↓
    injection scan
              ↓
    domain detection + model resolution (parallel)
              ↓
    constraint loading
              ↓
    LLM reviews diff against constraint profile
              ↓
    structured JSON: issues[], summary, clean
              ↓
    findings returned with severity, line numbers, suggested fixes
```

### Dashboard Request Flow

```
Browser → Next.js proxy (/api/orch/[...path])
              ↓
    reads orch_key from httpOnly cookie (set at onboarding)
              ↓
    forwards to orch_core with Authorization: Bearer orch_xxx
              ↓
    orch_core resolves team + member from API key
```

---

## 4. Project Structure

```
orch/
├── orch_core/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              ← API key auth, member resolution, rate limit
│   │   │   └── v1/
│   │   │       ├── router.py        ← mounts all route modules
│   │   │       ├── orchestrate.py   ← POST /orchestrate, /orchestrate/stream
│   │   │       ├── review.py        ← POST /review — code audit
│   │   │       ├── audit.py         ← GET /audit, /audit/me, /audit/{session_id}
│   │   │       ├── onboarding.py    ← create-org, create-individual, /me, register-repo, resolve-repo
│   │   │       ├── members.py       ← list, invite, accept-invite
│   │   │       ├── models.py        ← list, add, deactivate
│   │   │       ├── constraints.py   ← list, upsert, delete
│   │   │       ├── health.py        ← scores, override
│   │   │       ├── status.py        ← org/team/policy summary
│   │   │       ├── keys.py          ← generate API key
│   │   │       └── registry.py      ← known model list
│   │   ├── core/
│   │   │   ├── pipeline.py          ← orchestration engine (streaming + standard)
│   │   │   ├── domain_router.py     ← prompt classification
│   │   │   ├── model_resolver.py    ← policy enforcement + key selection
│   │   │   ├── constraint_loader.py ← Redis/DB constraint loading
│   │   │   ├── context_manager.py   ← token budgeting + summarization
│   │   │   ├── health_scorer.py     ← 0-100 health score computation
│   │   │   └── slugify.py
│   │   ├── db/
│   │   │   ├── client.py            ← Prisma singleton
│   │   │   └── repositories/        ← session, message, constraint, model_config, member, invite, health
│   │   ├── models/
│   │   │   ├── schemas.py           ← Pydantic request/response models
│   │   │   └── errors.py            ← custom exception types
│   │   ├── security/
│   │   │   ├── injection.py         ← injection scanning + canary tokens
│   │   │   └── middleware.py        ← request size limit, content-type enforcement
│   │   ├── services/
│   │   │   ├── llm.py               ← litellm wrapper, streaming, fallback, key redaction
│   │   │   ├── cache.py             ← Redis with double-checked lock
│   │   │   ├── rate_limiter.py      ← sliding window rate limiting
│   │   │   ├── encryption.py        ← Fernet local + AWS KMS envelope encryption
│   │   │   └── summarizer.py        ← conversation summarization
│   │   ├── workers/
│   │   │   ├── persistence.py       ← async turn persistence
│   │   │   └── health_worker.py     ← background health recomputation
│   │   ├── app.py                   ← app factory
│   │   ├── config.py                ← pydantic-settings
│   │   └── logging.py
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   ├── main.py
│   ├── seed.py
│   └── requirements.txt
│
├── orch_dashboard/
│   ├── app/
│   │   ├── (auth)/                  ← sign-in, sign-up, onboarding
│   │   ├── (dashboard)/             ← all dashboard pages
│   │   ├── actions/onboarding.ts    ← server actions (createOrg, switchOrg, getMe)
│   │   └── api/orch/[...path]/      ← Next.js proxy to orch_core
│   ├── components/
│   │   └── layout/                  ← Sidebar, Header, OrgSwitcher, ThemeProvider, RouteGuard
│   ├── hooks/
│   │   ├── useRole.ts               ← useMe, useRole, useHasAccess
│   │   └── useOrchStatus.ts         ← useOrchStatus, useModels, useHealth, useAuditLog
│   ├── lib/
│   │   ├── api.ts                   ← all API methods
│   │   ├── gate.ts                  ← requireOnboarded server guard
│   │   ├── auth.ts                  ← getRole (reads from Orch, not Clerk)
│   │   └── clerkAppearance.ts       ← Clerk UI customisation
│   ├── stores/chatStore.ts          ← Zustand chat state
│   └── types/index.ts               ← all TypeScript types
│
├── orch_cli/
│   └── orch.py                      ← Typer CLI (login, ask, chat, audit, models, status, health)
│
├── orch_extension/
│   └── src/
│       ├── extension.ts             ← VS Code extension entry
│       ├── config.ts                ← .orch/config resolution
│       ├── api.ts                   ← orch_core API client
│       └── statusBar.ts             ← constraint profile status bar
│
└── orch_action/
    ├── action.yml               ← inputs, outputs, branding
    ├── example-workflow.yml     ← drop into .github/workflows/ to activate
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts             ← entry point, orchestrates full review flow
        ├── diff.ts              ← unified diff parser, line number mapping
        ├── review.ts            ← calls /api/v1/review per file
        ├── comments.ts          ← inline PR comments + summary comment
        └── ignore.ts            ← glob pattern matching
```

---

## 5. Database Schema

```
Organization
  id, name, slug, ownerClerkId
  modelPolicy (open | allowlist | enforced)
  enforcedModel, defaultModelId, fallbackModelIds
  repoUrls[]          ← git remotes registered via orch init
  tier (free | pro | business | enterprise)
  → teams[], modelConfigs[], invites[], auditEvents[], billing

Team
  id, name, orgId
  → org, apiKeys[], members[], sessions[], invites[]

Member
  id, clerkId, email, name, role, teamId
  ── clerkId is NOT globally unique ──
  ── one person can belong to multiple orgs ──
  @@unique([clerkId, teamId])
  @@unique([email, teamId])
  → team, apiKeys[], sessions[], auditEvents[]

ApiKey
  id, key, label, teamId, memberId, isActive
  → team, member

ModelConfig
  id, orgId, displayName, provider, modelId
  endpoint, encryptedKey, contextWindow, isActive
  → org

Session
  id, createdAt, constraintVersion, teamId, memberId
  → team, member, messages[]

Message
  id, role, content, createdAt, sessionId
  modelUsed, inputTokens, outputTokens
  → session

DomainConstraint
  id (domain name), description, constraints (system prompt)
  gptVariant, claudeVariant, geminiVariant
  version, updatedAt
  → overrides[], healthScores[]

ConstraintOverride
  id, constraintId, sessionId, modelUsed, reason, createdAt

ConstraintHealth
  id, constraintId, orgId
  totalRequests, totalOverrides, overrideRate
  healthScore (0-100), lastComputed
  @@unique([constraintId, orgId])

Invite
  id, email, role, teamId, orgId, token
  accepted, expiresAt, invitedBy
  → team, org

AuditEvent
  id, orgId, memberId, clerkId
  action, resource, metadata, ip, createdAt
  @@index([orgId]), @@index([memberId]), @@index([createdAt])

Billing
  id, orgId, stripeCustomerId, stripeSubscriptionId
  plan, status, currentPeriodStart, currentPeriodEnd
  cancelAtPeriodEnd
  → org

ModelRelease
  id, modelId, provider, displayName
  contextWindow, detectedAt, notifiedOrgs[]
```

---

## 6. Model Policy System

Three tiers control which AI models developers can use:

| Policy | Behaviour | Use case |
|---|---|---|
| `enforced` | All requests use one model. Developer choice silently overridden. Personal keys blocked. | Banks, healthcare, data residency |
| `allowlist` | Developers choose from approved list only. Personal keys allowed but model must still be on the list. | Mid-size companies |
| `open` | Any model. Personal keys allowed. Constraints still enforced. | Startups, small teams |

### Key Source Priority

1. `enforced` policy → org's configured model + org's encrypted key
2. Developer personal key (`X-Model-API-Key` header) — used for request only, never stored
3. Org model config → team's shared encrypted key from `ModelConfig` table
4. No key configured → `422` error with actionable hint — Orch never falls back to its own key

### Developer Personal Keys

Developers pass their own provider key via `X-Model-API-Key`. The key:
- Lives in memory for one request only
- Is never written to DB, logs, or cache
- Is redacted from all error messages before logging
- Under `allowlist` policy: model must still be on the approved list even with a personal key

---

## 7. Multi-Org and Multi-Project Support

### One person, multiple orgs

A developer, consultant, or CTO can belong to unlimited orgs under one login. `clerkId` is unique per team, not globally. The dashboard shows an org switcher in the header — click to switch, entire context updates instantly.

### Multiple projects per org

Each project gets its own `.orch/config` with the org's API key. The extension and CLI walk up the directory tree from the current file to find the nearest config — closest one wins. Same pattern as `.gitignore`.

```
~/projects/
├── acme-backend/
│   └── .orch/config  →  api_key: orch_aaa  (Acme)
├── beta-corp-api/
│   └── .orch/config  →  api_key: orch_bbb  (Beta Corp)
└── personal/
    └── .orch/config  →  api_key: orch_ccc  (Personal)
```

### Auto-detection via git remote

`orch init` registers the repo's git remote URL against the org via `POST /api/v1/onboarding/register-repo`. On subsequent activations, the extension calls `GET /api/v1/onboarding/resolve-repo` with the current git remote — gets back the right API key automatically. Zero developer action after initial setup.

### Fallback chain

1. Nearest `.orch/config` in directory tree
2. Global `~/.orch/config` default key
3. Prompt once: "Run `orch init` to connect this repo"

---

## 8. GitHub App Integration

### What It Does

The GitHub App is the zero-friction deployment layer. When the CTO connects their GitHub org:

1. Orch GitHub App installs on all repos in the org automatically
2. The workflow file (`orch.yml`) is committed to every repo
3. Every PR from that point is reviewed — no developer action required
4. New repos created in the future are covered automatically

### How It Works

```
CTO clicks "Connect GitHub" in Orch dashboard
        ↓
Redirected to GitHub App installation page
        ↓
CTO selects org (or all repos)
        ↓
GitHub sends POST /api/v1/github/webhook with event: installation.created
        ↓
Orch webhook handler:
  1. Verifies webhook signature (HMAC-SHA256)
  2. Stores GitHubInstallation record (installation_id → org_id)
  3. For each repo in the installation:
     - Commits .github/workflows/orch.yml via GitHub API
     - Records repo as covered in GitHubInstallation.repos[]
        ↓
Dashboard shows connected repos and coverage
```

### GitHub App Setup (One-Time Manual Step)

Before the integration works, the GitHub App must be registered:

1. Go to `https://github.com/settings/apps/new`
2. Set:
   - Name: `Orch Code Review`
   - Homepage URL: your Orch dashboard URL
   - Webhook URL: `https://your-orch-instance.com/api/v1/github/webhook`
   - Webhook secret: generate a random string, save as `GITHUB_WEBHOOK_SECRET`
3. Permissions:
   - Repository: `Contents` (read & write) — to commit workflow file
   - Repository: `Pull requests` (read & write) — to post review comments
   - Repository: `Checks` (read & write) — to set check status
   - Repository: `Metadata` (read) — required
4. Subscribe to events: `Pull request`, `Installation`
5. Generate a private key — save as `GITHUB_APP_PRIVATE_KEY`
6. Note the App ID — save as `GITHUB_APP_ID`

### Database Model

```
GitHubInstallation
  id                  — internal ID
  installationId      — GitHub's installation ID (unique per org)
  githubOrgName       — GitHub org/user login
  githubOrgId         — GitHub org/user ID
  orgId               — Orch org this installation belongs to
  repos[]             — list of covered repo full names
  workflowCommitted   — whether workflow file was committed
  installedAt         — when the app was installed
  active              — false if uninstalled
```

### Webhook Events Handled

| Event | Action | What Orch Does |
|---|---|---|
| `installation` | `created` | Store installation, commit workflow to all repos |
| `installation` | `deleted` | Mark installation inactive, stop coverage |
| `installation_repositories` | `added` | Commit workflow to newly added repos |
| `installation_repositories` | `removed` | Remove repo from coverage list |

### Workflow File Committed to Repos

Orch commits this file to `.github/workflows/orch.yml` in every covered repo:

```yaml
name: Orch Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  contents: read
  pull-requests: write
jobs:
  orch-review:
    runs-on: ubuntu-latest
    steps:
      - uses: orch-dev/review-action@v1
        with:
          api_key: ${{ secrets.ORCH_API_KEY }}
          api_url: ${{ secrets.ORCH_API_URL }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Note:** The CTO still needs to add `ORCH_API_KEY` and `ORCH_API_URL` as repository secrets. This is a one-time step per org, done from the Orch dashboard GitHub connect page.

### Environment Variables Required

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | GitHub App ID from app settings |
| `GITHUB_APP_PRIVATE_KEY` | PEM private key (base64 encoded) |
| `GITHUB_WEBHOOK_SECRET` | Webhook secret for signature verification |

---

## 9. API Reference

All endpoints require `Authorization: Bearer orch_<key>` except `/health` and `/api/v1/onboarding/*`.

---

### Health

**`GET /health`** — liveness check, no auth
```json
{ "status": "ok", "version": "3.0.0", "env": "development" }
```

---

### Orchestrate

**`POST /api/v1/orchestrate`** — standard response
```json
// request
{
  "user_prompt": "Write a user creation endpoint",
  "domain": "auto",
  "model": "auto",
  "session_id": null
}

// response
{
  "domain_identified": "backend",
  "model_executed": "GPT-4o",
  "session_id": "a3f2c1d4-...",
  "structured_output": "...",
  "input_tokens": 312,
  "output_tokens": 847,
  "key_source": "team_config"
}
```

**`POST /api/v1/orchestrate/stream`** — SSE streaming
```
data: {"type":"meta","session_id":"...","domain":"backend","model":"GPT-4o"}
data: {"type":"chunk","content":"Here is"}
data: {"type":"chunk","content":" the endpoint"}
data: [DONE]
```

---

### Review

**`POST /api/v1/review`** — code audit against org constraints
```json
// request
{
  "filename": "auth.py",
  "diff": "def login(user, password):\n    ...",
  "domain": "auto",
  "model": "auto"
}

// response
{
  "filename": "auth.py",
  "domain_identified": "backend",
  "model_executed": "GPT-4o",
  "clean": false,
  "summary": "2 security issues found in authentication logic.",
  "issues": [
    {
      "severity": "critical",
      "line": 4,
      "title": "Plain text password comparison",
      "detail": "Password is compared without hashing.",
      "constraint_id": "backend",
      "suggested_fix": "Use bcrypt.checkpw(password.encode(), stored_hash)"
    }
  ]
}
```

---

### Audit

**`GET /api/v1/audit`** — all sessions for the org
- `?member_id=` filter by developer
- `?limit=` max 200

**`GET /api/v1/audit/me`** — current member's own sessions

**`GET /api/v1/audit/{session_id}`** — full message thread
```json
{
  "session_id": "...",
  "developer": { "email": "alice@acme.com", "name": "Alice", "role": "member" },
  "messages": [
    { "role": "user", "content": "...", "model_used": null, "input_tokens": 45 },
    { "role": "model", "content": "...", "model_used": "gpt-4o", "output_tokens": 312 }
  ]
}
```

---

### Onboarding

**`POST /api/v1/onboarding/create-org`** — create a new org (works for existing users too)

**`POST /api/v1/onboarding/create-individual`** — personal workspace

**`GET /api/v1/onboarding/me?clerk_id=&org_id=`** — all orgs for a user
```json
{
  "onboarded": true,
  "email": "alice@acme.com",
  "name": "Alice",
  "role": "owner",
  "org": { "id": "...", "name": "Acme Corp", "model_policy": "allowlist" },
  "team": { "id": "...", "name": "Engineering" },
  "api_key": "orch_...",
  "orgs": [
    { "org_id": "...", "org_name": "Acme Corp", "role": "owner", "api_key": "orch_aaa" },
    { "org_id": "...", "org_name": "Personal", "role": "owner", "api_key": "orch_bbb" }
  ]
}
```

**`POST /api/v1/onboarding/register-repo`** — register git remote against org

**`GET /api/v1/onboarding/resolve-repo?repo_url=&clerk_id=`** — auto-detect org from git remote

---

### Members

**`GET /api/v1/members`** — list team members

**`POST /api/v1/members/invite`** — create invite link (7-day expiry)

**`POST /api/v1/members/accept-invite`** — accept invite, create member record

---

### Models

**`GET /api/v1/models`** — list approved models for org

**`POST /api/v1/models`** — add a model with encrypted API key

**`DELETE /api/v1/models/{config_id}`** — deactivate a model

---

### Constraints

**`GET /api/v1/constraints`** — list all constraint profiles

**`PUT /api/v1/constraints/{id}`** — create or update (upsert), invalidates Redis cache

**`DELETE /api/v1/constraints/{id}`** — delete custom constraints (built-ins protected)

---

### Health

**`GET /api/v1/health/scores`** — constraint health scores for org

**`POST /api/v1/health/override`** — log a constraint override with reason

---

### Status

**`GET /api/v1/status`** — org, team, model policy, constraint profiles

---

## 10. Security

### Prompt Injection Defense

Every prompt is scanned against regex patterns before processing:
- Instruction override attempts (`ignore previous instructions`, `disregard`, `bypass`)
- Persona hijacking (`you are now`, `act as`, `pretend to be`, `roleplay as`)
- System prompt extraction (`reveal your prompt`, `show your instructions`)
- Jailbreak markers (`[system]`, `[assistant]`, `###instruction`)

Unicode normalisation (NFKC) catches lookalike character attacks.

### Canary Tokens

A unique token is embedded in every system instruction. If it appears in the model's output, the system prompt was leaked — response is blocked, incident logged.

### Credential Encryption

Org API keys stored with Fernet (AES-128-CBC + HMAC-SHA256) locally, or AWS KMS envelope encryption in production. Keys decrypted in memory at request time only. Never logged.

### Error Redaction

All LLM error messages are scrubbed before logging or returning to clients. Patterns redacted: `sk-`, `AIza`, `ant-`, `Bearer`, `api_key=`. A developer's personal key can never appear in logs or error responses.

### Rate Limiting

Redis sliding window per API key. Tier-based:

| Tier | Requests/minute |
|---|---|
| Free | 10 |
| Pro | 60 |
| Business | 200 |
| Enterprise | 1,000 |

Degrades gracefully if Redis is unavailable.

### Route Protection

Dashboard admin routes (`/team`, `/constraints`, `/models`, `/audit-log`, `/analytics`) are protected by `RouteGuard` — non-admins are redirected to home even on direct URL navigation.

---

## 11. Constraint Health System

Every constraint override is logged. The health scorer computes a 0–100 score per constraint per org:

| Score | Status | Meaning |
|---|---|---|
| 80–100 | healthy | Constraint is working well |
| 60–79 | warning | Override rate rising, review recommended |
| 0–59 | critical | Constraint is being ignored, action required |

Scores recompute asynchronously after every pipeline execution. Recommendations are generated when score drops.

---

## 12. Performance

### Parallelisation

The pipeline runs DB operations in parallel wherever there are no dependencies:

- `deps.py` — member lookup + rate limit check run in parallel
- `pipeline._prepare()` — two gather phases:
  - Phase 1: session history + domain detection (parallel)
  - Phase 2: model resolution + constraint loading (parallel)
- `model_resolver._build_fallbacks()` — all fallback configs fetched in one gather
- `audit.py` — all session messages fetched in one bulk query, grouped in memory

### Caching

- Constraint profiles: Redis, 5-minute TTL
- LLM responses: Redis, 1-hour TTL (non-streaming only)
- Role and org status: React Query, `staleTime: Infinity` (session-scoped)
- API key: httpOnly cookie set at onboarding, read by proxy on every request — zero DB lookup per request

### Redis Connection

Double-checked lock prevents race condition on first connection. Graceful degradation if Redis is unavailable.

---

## 13. How to Run

### orch_core

```bash
cd orch_core
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL (PostgreSQL) and at least one LLM key

prisma generate
prisma db push
python seed.py
uvicorn main:app --reload
```

### orch_dashboard

```bash
cd orch_dashboard
npm install
# create .env.local:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
# CLERK_SECRET_KEY=sk_...
# ORCH_API_URL=http://127.0.0.1:8000
# ORCH_API_KEY=orch_...  (server-to-server key from seed.py output)
# LOCAL_ENCRYPTION_KEY=your-secret-string
npm run dev
```

### orch_cli

```bash
cd orch_cli
pip install typer rich httpx
orch login
orch ask "How do I implement JWT refresh tokens?"
```

---

## 14. Environment Variables

### orch_core

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL or SQLite connection string |
| `GEMINI_API_KEY` | For Gemini | — | Google AI API key |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection |
| `DEFAULT_MODEL` | No | `gemini/gemini-1.5-pro` | Fallback model |
| `ROUTER_MODEL` | No | `gemini/gemini-1.5-flash` | Domain detection model |
| `LOCAL_ENCRYPTION_KEY` | Yes (prod) | weak default | Key for Fernet encryption of org API keys |
| `KMS_KEY_ID` | No | — | AWS KMS key for production encryption |
| `AWS_REGION` | No | `us-east-1` | AWS region |
| `ENV` | No | `development` | `development` or `production` |
| `RATE_LIMIT_FREE` | No | `10` | Requests/min, free tier |
| `RATE_LIMIT_PRO` | No | `60` | Requests/min, pro tier |
| `RATE_LIMIT_BUSINESS` | No | `200` | Requests/min, business tier |
| `RATE_LIMIT_ENTERPRISE` | No | `1000` | Requests/min, enterprise tier |
| `CONTEXT_WINDOW_DEFAULT` | No | `128000` | Default token limit |
| `CONTEXT_BUDGET_OUTPUT` | No | `4000` | Reserved tokens for model output |
| `GITHUB_APP_ID` | For GitHub App | — | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | For GitHub App | — | PEM private key, base64 encoded |
| `GITHUB_WEBHOOK_SECRET` | For GitHub App | — | Webhook signature verification secret |

### orch_dashboard

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `ORCH_API_URL` | Yes | orch_core base URL |
| `ORCH_API_KEY` | Yes | Server-to-server API key for onboarding endpoints |
| `LOCAL_ENCRYPTION_KEY` | Yes (prod) | Must match orch_core value |

---

## 15. Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI |
| ORM | Prisma Client Python |
| Database | PostgreSQL |
| LLM Abstraction | litellm (100+ models, unified interface) |
| Token Counting | tiktoken |
| Caching | Redis |
| Credential Encryption | Fernet (local) / AWS KMS (prod) |
| CLI | Typer + Rich |
| Validation | Pydantic v2 |
| Config | pydantic-settings |
| Dashboard Framework | Next.js 14 (App Router) |
| Dashboard Styling | Tailwind CSS + shadcn/ui |
| Dashboard Auth | Clerk (login/signup only — all product data in Orch) |
| Dashboard State | React Query + Zustand |
| Dashboard Charts | Recharts |
| Hosting | AWS ECS Fargate (planned) |
| Billing | Stripe (planned) |

---

## 16. Roadmap

### Built and functional
- Full orchestration pipeline — streaming, fallback, caching, injection defense, canary tokens
- Code review endpoint — structured findings with severity, line numbers, suggested fixes
- RAG constraint retrieval — semantic search over constraint chunks via pgvector
- Multi-tenancy — org → team → member → API key, one person multiple orgs
- Three-tier model policy enforcement with personal key isolation
- Credential encryption — Fernet local, AWS KMS production
- Context window management — tiktoken budgeting + summarization
- Constraint health scoring — override tracking, 0-100 score, recommendations
- Per-developer audit log — session drill-down, full message thread
- Rate limiting — Redis sliding window, tier-based
- Web dashboard — all pages functional, dark mode, org switcher, route guards
- Developer CLI — login, ask, chat, audit, models, status, health
- VS Code extension — scaffold, config resolution, status bar
- GitHub Action — PR review, parallel file review, inline comments, summary comment, merge blocking

### In progress
- Deployment — orch_core needs a live URL (Railway recommended)
- `orch init` — one command setup, git remote registration, pre-commit hook
- VS Code extension — auto-configure from GitHub identity, silent enforcement, right-click audit

### Planned
- GitHub App — connects to GitHub org, auto-installs Action on all repos, zero CTO setup
- Pre-commit hook — reviews staged diff before every commit, blocks on critical findings
- Coverage metric — % of commits reviewed per developer and repo, visible to CTO
- Compliance export — audit log CSV/JSON for SOC2 auditors
- Billing / Stripe — tier enforcement via payment
- SSO — Okta, Azure AD
- On-premise deployment — Docker Compose + Helm
- Multi-region — EU data residency for GDPR
- SOC2 Type I

---

## License

Private — All rights reserved.
