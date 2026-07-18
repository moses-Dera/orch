# Orch — Architecture & Product Design

> Last updated: July 2026

---

## What Orch Is

Orch is the **Centralized Control Plane for Policy-as-Code**. 

It sits between developers and their AI tools—dynamically distributing enterprise standards to local IDEs, providing a zero-latency proxy for autonomous agents, and enforcing strict, deterministic compliance gates in CI/CD.

**Whether code is written by a junior developer or an autonomous agent, Orch ensures your standards travel with them.**

---

## The Core Insight

While other tools focus on intercepting generic prompts or reviewing code *after* it's merged, Orch operates on three pillars:

1. **Dynamic Context Distribution:** We manage `.github/copilot-instructions.md` and `.cursorrules` dynamically so developers don't have to.
2. **Deterministic Enforcement:** Because LLMs are probabilistic, injecting constraints isn't enough. We deterministically block non-compliant PRs.
3. **Agentic Guardrails:** For autonomous agents, Orch acts as the proxy firewall, enforcing budgets and filesystem boundaries via the Model Context Protocol (MCP).

---

## System Architecture

```
┌─────────────────────────────────────────┐
│            The Orch Dashboard           │
│   CTOs define models, rules, budgets    │
└──────────────────┬──────────────────────┘
                   │ (Hono RPC)
┌──────────────────▼──────────────────────┐
│                 ORCH CORE               │
│         (Bun + Hono + Drizzle ORM)      │
│                                         │
│  1. Constraint Management (RAG)         │
│  2. Token/Budget Telemetry              │
│  3. Agentic Proxy (OpenAI format)       │
│  4. CI/CD Diff Reviewer                 │
└─┬────────────────┬────────────────────┬─┘
  │                │                    │
  │ (Hono RPC)     │ (Hono RPC)         │ (REST /v1/chat/completions)
  ▼                ▼                    ▼
┌────────┐    ┌─────────┐      ┌───────────────┐
│  CLI   │    │ Action  │      │ Agent / IDE   │
│ (sync) │    │ (CI/CD) │      │ (SWE-agent)   │
└────────┘    └─────────┘      └───────────────┘
```

---

## Technology Stack

Our stack is heavily optimized for zero-latency execution, typesafe monorepo communication, and edge compatibility.

| Layer | Technology | Reason |
|---|---|---|
| **Runtime** | Bun | Sub-5ms cold starts, native TypeScript, insanely fast execution. |
| **Framework** | Hono | Lightweight, edge-compatible web framework. |
| **Monorepo** | pnpm workspaces | One toolchain, unified dependencies. |
| **Internal RPC**| Hono RPC | End-to-end type safety between backend, CLI, and dashboard without code generation. |
| **LLM Gateway** | OpenRouter | 300+ models, one API key, no provider relationships. |
| **Database** | PostgreSQL + pgvector | Multi-tenant schema + RAG semantic search. |
| **ORM** | Drizzle ORM | Zero-overhead, edge-compatible, SQL-like execution (replacing Prisma for speed). |
| **Cache** | Redis (ioredis) | Rate limiting, response cache, constraint cache. |
| **Auth** | Headless Clerk + Webhook Sync | Custom UI for dashboard, webhooks sync user data to Drizzle. |
| **Dashboard** | Next.js | React-based frontend. |

---

## Monorepo Structure

```
orchestrator/
├── pnpm-workspace.yaml
├── packages/
│   ├── types/        ← Shared TypeScript types (Zod schemas, DB models)
│   ├── core/         ← Hono + Bun API server + Drizzle schema
│   └── cli/          ← Bun CLI (orch sync, audit, auth)
└── apps/
    ├── dashboard/    ← Next.js CTO dashboard
    ├── action/       ← GitHub Action PR reviewer
    └── extension/    ← VS Code Extension
```

Shared types are defined once in `packages/types` and `packages/core`. By utilizing **Hono RPC**, the `dashboard` and `cli` get perfect, zero-build type inference directly from the core API routes.

---

## The Three Pillars of Execution

### 1. Dynamic Context Distribution (Local IDEs)
For tools like GitHub Copilot and Cursor, network-level proxy interception is often impossible or introduces friction. 
*   **Mechanism:** The `orch_cli` or `orch_extension` runs an `orch sync` command. It fetches the latest organizational constraints via Hono RPC from `orch_core`.
*   **Execution:** It dynamically rewrites the `.github/copilot-instructions.md` and `.cursorrules` files in the developer's local workspace. 
*   **Result:** The developer gets organizational compliance instantly without modifying their network settings.

### 2. Deterministic CI/CD Enforcement (The True Gate)
LLMs hallucinate. A constraint is a suggestion until it is enforced.
*   **Mechanism:** `orch_action` runs on every PR. It parses the diff and sends it to `orch_core` for review against the exact same constraints synced to the IDE.
*   **Execution:** If critical constraints are violated (e.g., using raw SQL instead of the required ORM), the GitHub Action fails, physically blocking the merge.
*   **Result:** A deterministic safety net that prevents AI hallucinations from entering production.

### 3. Agentic Guardrails (The Proxy)
For autonomous tools (SWE-agent, Aider, Cline), Orch acts as the standard AI gateway.
*   **Mechanism:** `orch_core` exposes an OpenAI-compatible REST proxy (`/v1/chat/completions`). 
*   **Execution:** Before forwarding the agent's request to OpenRouter, Orch validates the agent's token budget, injects boundaries, and logs every step.
*   **Result:** Total visibility and control over autonomous AI workers.

---

## OpenRouter Integration

Orch has one external LLM relationship — OpenRouter. No direct relationships with OpenAI, Anthropic, or Google.

Benefits:
- 300+ models via one API key
- No per-provider SDK, authentication, or error handling
- Org admins add their own OpenRouter key in the dashboard
- Orch never holds provider credentials beyond what the org provides

---

## What Orch Captures Per Session

Every AI interaction through the proxy is logged with full attribution:

```
Developer:        Moses (member ID, team, org)
Tool used:        Claude Code / Cursor / Aider
Model:            claude-3.5-sonnet
Tokens:           2,847 in / 1,203 out
Cost:             $0.043
Constraint:       backend-v2 (version pinned at session start)
Domain:           backend
Session:          full message thread
Timestamp:        2026-07-01T05:14:23Z
```

CTOs see this aggregated per developer, per team, per model, per time period in the Next.js Dashboard.
