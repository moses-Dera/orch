# Orch — Architecture & Product Design

> Last updated: July 2026

---

## What Orch Is

Orch is the **AI governance layer for engineering teams.**

It sits between developers and any AI model they use — enforcing your org's engineering standards silently in the background, logging every session, and giving CTOs complete visibility into how AI is being used across their team.

**Developers use any AI agent they want. Orch makes sure your standards travel with them.**

---

## The Core Insight

Most AI governance tools review code *after* it is written.

Orch enforces standards *before* the AI generates anything — by injecting org constraints directly into the AI's system prompt. The output is already compliant before the developer sees it.

```
Other tools:   AI writes code  →  review it after
Orch:          AI receives constraints  →  writes compliant code from the start
```

---

## System Architecture

```
┌─────────────────────────────────────────┐
│            AI Providers                 │
│   OpenAI · Anthropic · Google · Meta   │
└──────────────────┬──────────────────────┘
                   │ (via OpenRouter — one key, 300+ models)
┌──────────────────▼──────────────────────┐
│                 ORCH                    │
│                                         │
│  /v1/chat/completions  (OpenAI format)  │
│  /v1/messages          (Anthropic fmt)  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         Pipeline                │    │
│  │  1. Receive request             │    │
│  │  2. Inject org constraints      │    │
│  │  3. Enforce model policy        │    │
│  │  4. Forward to OpenRouter       │    │
│  │  5. Stream response back        │    │
│  │  6. Log session + tokens + cost │    │
│  └─────────────────────────────────┘    │
│                                         │
│  /api/v1/...  (Orch management API)     │
└──────────────────┬──────────────────────┘
                   │ (OpenAI-compatible or Anthropic-compatible)
┌──────────────────▼──────────────────────┐
│           Developer Tools               │
│  Cursor · Claude Code · Aider · Cline  │
│  Continue · Codex CLI · SWE-agent      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│             The Codebase                │
└─────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Bun | 8x faster than Python/uvicorn, 5ms cold start |
| Framework | Hono | Fastest web framework, edge-compatible |
| Monorepo | pnpm workspaces | One toolchain across all packages |
| LLM Gateway | OpenRouter | 300+ models, one API key, no provider relationships |
| Database | PostgreSQL + pgvector | Multi-tenant schema + RAG semantic search |
| Cache | Redis (ioredis) | Rate limiting, response cache, constraint cache |
| Auth | Clerk | Dashboard authentication only |
| Dashboard | Next.js | Already built |

---

## Monorepo Structure

```
orchestrator/
├── packages/
│   ├── types/        ← shared TypeScript types (PromptRequest, OrchResponse, etc.)
│   ├── core/         ← Hono + Bun API server
│   └── cli/          ← TypeScript CLI (orch ask, audit, chat, health)
├── apps/
│   ├── dashboard/    ← Next.js CTO dashboard (already built)
│   └── action/       ← GitHub Action PR reviewer (already built)
├── pnpm-workspace.yaml
└── turbo.json
```

Shared types are defined once in `packages/types` and imported by every package — zero type drift between frontend, backend, and CLI.

---

## Proxy Endpoints

Orch exposes two proxy formats so developers can use any tool without changing their workflow:

### OpenAI-Compatible
```
POST /v1/chat/completions
Authorization: Bearer orch_xxxxxxxxxxxx
```
Works with: Cursor, Continue.dev, Aider, Codex CLI, SWE-agent, any OpenAI SDK user.

### Anthropic-Compatible
```
POST /v1/messages
X-API-Key: orch_xxxxxxxxxxxx
```
Works with: Claude Code, any Anthropic SDK user.

Both endpoints feed into the same internal pipeline — one codebase, two entry formats.

---

## Developer Setup

One-time configuration. Never touched again.

**For most tools (Cursor, Aider, Continue, etc.):**
```bash
export OPENAI_BASE_URL="https://orch.yourdomain.com/v1"
export OPENAI_API_KEY="orch_xxxxxxxxxxxx"
```

**For Claude Code:**
```bash
export ANTHROPIC_BASE_URL="https://orch.yourdomain.com"
export ANTHROPIC_API_KEY="orch_xxxxxxxxxxxx"
```

**For the CLI:**
```bash
orch login  # paste Orch API key once
```

After that, the developer uses any AI agent exactly as before. Orch is invisible.

---

## Constraint Injection

When a request arrives at Orch, the pipeline:

1. Loads the org's active constraint profile for the detected domain (backend, security, etc.)
2. Injects it into the AI's system prompt before forwarding
3. The constraint instructs the AI to explain violations and offer compliant alternatives

**Example constraint snippet:**
```
This org uses PostgreSQL only — never suggest MongoDB or other databases.
All auth must use Clerk — never implement custom JWT or session logic.
TypeScript strict mode is required — never use `any` or type casting.

If the user requests something that violates these standards,
tell them which constraint it breaks and provide the compliant alternative.
```

The AI itself becomes the teacher — explaining violations in context, inside the tool the developer is already using.

---

## Developer Feedback Layers

Developers receive feedback at every stage of their workflow:

### 1. In-context (while prompting)
The AI explains constraint violations and provides compliant alternatives in its response. Developer gets educated without leaving their tool.

```
Developer: "use MongoDB for this user model"
AI (Orch): "Your org requires PostgreSQL (constraint: backend-v2).
            Here's the equivalent with Prisma and PostgreSQL:..."
```

### 2. Pre-commit hook (before code lands)
Installed automatically by `orch init`. Reviews staged diff before commit.

```bash
$ git commit -m "add user model"

⚠️  Orch found 2 issues in staged files:
  auth/user.ts:34  — raw SQL detected (constraint: use Prisma ORM only)
  auth/user.ts:67  — password stored without hashing (constraint: security-v1)

Commit blocked. Fix or run: orch override --reason "..."
```

### 3. PR inline comments (automated)
`orch_action` triggers on every PR. Reviews the diff, posts inline GitHub comments with exact line numbers and suggested fixes.

### 4. VS Code diagnostics (extension)
Red/yellow squiggles directly in the editor as code is written — same UX as TypeScript errors but for org constraints.

---

## Model Policy

Three modes, set by the CTO per org:

| Mode | Behaviour |
|---|---|
| **Enforced** | One model for all developers — no exceptions |
| **Allowlist** | Developers choose from an approved list of models |
| **Open** | Any model allowed — Orch logs but does not restrict |

Even in Open mode, Orch logs everything: model used, tokens, cost, session content.

---

## OpenRouter Integration

Orch has one external LLM relationship — OpenRouter. No direct relationships with OpenAI, Anthropic, or Google.

Benefits:
- 300+ models via one API key
- No per-provider SDK, authentication, or error handling
- Provider outages are OpenRouter's problem, not Orch's
- Org admins add their own OpenRouter key in the dashboard
- Orch never holds provider credentials beyond what the org provides

```typescript
// All LLM calls — every model — one function
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { "Authorization": `Bearer ${openrouterKey}` },
  body: JSON.stringify({ model, messages, stream: true })
})
```

---

## What Orch Captures Per Session

Every AI interaction is logged with full attribution:

```
Developer:        Moses (member ID, team, org)
Tool used:        Claude Code / Cursor / Aider
Model:            claude-sonnet-4
Tokens:           2,847 in / 1,203 out
Cost:             $0.043
Constraint:       backend-v2 (version pinned at session start)
Domain:           backend
Session:          full message thread
Timestamp:        2026-07-01T05:14:23Z
```

CTO sees this aggregated per developer, per team, per model, per time period.

---

## What Orch Cannot Intercept

| Tool | Reason |
|---|---|
| Claude.ai (browser) | Anthropic's closed web app |
| ChatGPT.com (browser) | OpenAI's closed web app |
| GitHub Copilot | Microsoft's closed infrastructure |
| Devin | Cognition's closed infrastructure |
| Claude Max subscription | Uses Anthropic's own infra, no base URL override |

No governance tool on earth can intercept these. The mitigation is:
1. Company policy — prohibited tools are a workplace rule
2. Network enforcement — IT blocks direct API endpoints at the firewall
3. PR review — `orch_action` catches any AI-generated code regardless of source at PR time

---

## Market Position

```
Above Orch:   AI providers (OpenAI, Anthropic, Google)
               ↓ (via OpenRouter)
              ORCH  ← governance middleware
               ↓ (OpenAI/Anthropic-compatible proxy)
Below Orch:   Developer tools (Cursor, Claude Code, Aider)
```

Orch is not an AI provider. Orch is not a code review tool.

Orch is the **mandatory middleware layer** that orgs install once to gain visibility and control over all AI usage across their engineering team — regardless of which AI tools their developers prefer.

Analogous position: Auth0 for identity, Stripe for payments, Orch for AI governance.

---

## Target Customer

**Buyer:** CTO / VP Engineering / Head of Platform

**User:** Developer (ideally does not notice Orch is running)

**Company profile:**
- 20–500 engineers
- Already adopting or evaluating AI coding tools
- Operates in fintech, healthtech, govtech, or any regulated industry
- Needs audit trails, cost control, and compliance evidence

---

## Build Roadmap

### Phase 1 — Monorepo restructure
- `pnpm-workspace.yaml`
- `packages/types` — shared TypeScript interfaces
- Move `orch_dashboard` and `orch_action` into `apps/`

### Phase 2 — packages/core (Hono + Bun)
- Hono app setup with all existing routes
- OpenAI-compatible proxy endpoint (`/v1/chat/completions`)
- Anthropic-compatible proxy endpoint (`/v1/messages`)
- OpenRouter as single LLM gateway
- Port pipeline logic (`asyncio.gather` → `Promise.all`)
- Prisma JS client (same schema, same database)
- Redis via ioredis

### Phase 3 — packages/cli
- Rewrite `orch_cli` in TypeScript
- Same commands: `ask`, `audit`, `chat`, `health`, `status`, `override`
- Bun as the runtime

### Phase 4 — Connect
- Shared types imported everywhere
- Dashboard and action point to new core
- Full end-to-end test

### Phase 5 — Deploy
- Railway (orch_core + Redis + PostgreSQL)
- Vercel (orch_dashboard — already configured)

---

## What Is Already Built

| Component | Status |
|---|---|
| orch_core — FastAPI backend | ✅ Working (to be migrated) |
| orch_dashboard — Next.js CTO dashboard | ✅ Complete |
| orch_action — GitHub Action PR reviewer | ✅ Complete |
| orch_cli — Python CLI | ✅ Working (to be migrated to TS) |
| orch_extension — VS Code scaffold | ✅ Scaffold done |
| Prisma schema — multi-tenant | ✅ Complete |
| Pipeline — parallel phases, streaming | ✅ Complete |
| RAG constraint retrieval — pgvector | ✅ Complete |
| Security — injection defense, encryption | ✅ Complete |
| Constraint health scoring | ✅ Complete |
| Cost attribution per developer | ✅ Complete |
| Session audit log | ✅ Complete |
