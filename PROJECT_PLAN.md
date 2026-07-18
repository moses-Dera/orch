# Orch — Project Plan & Roadmap

This document outlines the engineering plan to execute the new strategic vision: transitioning Orch into the Centralized Control Plane for Policy-as-Code using Bun, Hono, Drizzle ORM, and Hono RPC.

---

## Phase 1: Foundation & Monorepo Setup (Completed)
- [x] Initialize `pnpm` workspace (`pnpm-workspace.yaml`).
- [x] Migrate `orch_dashboard`, `orch_action`, and `orch_extension` into `apps/`.
- [x] Create `packages/types`, `packages/core`, and `packages/cli` scaffolding.

---

## Phase 2: Core Rewrite (`packages/core`)
**Goal:** Replace the legacy Python FastAPI backend with an ultra-low-latency Bun + Hono API.

- [ ] **Setup Hono + Bun:** Initialize the base web server with standard middleware (CORS, Logger, Error Handling).
- [ ] **Database Migration (Drizzle):** 
  - Translate the Prisma PostgreSQL schema into Drizzle ORM schema definitions.
  - Re-implement the `pgvector` logic for RAG constraint retrieval using Drizzle's raw SQL or pgvector plugin.
- [ ] **Hono RPC Setup:** Export the `AppType` definition so the frontend and CLI can consume it with zero type drift.
- [ ] **Proxy Endpoints:** Rebuild the `/v1/chat/completions` REST endpoints to proxy OpenRouter with streaming support.

---

## Phase 3: The Dashboard Connection (`apps/dashboard`)
**Goal:** Migrate the existing Next.js frontend to natively consume the new core via Hono RPC.

- [ ] **RPC Client Integration:** Replace raw `fetch()` calls in the dashboard with the `hc` (Hono Client).
- [ ] **Auth Sync:** Ensure Clerk authentication tokens are properly passed through Hono RPC middleware.
- [ ] **Feature Parity:** Verify constraint management, audit logs, and team management work flawlessly against the new Drizzle backend.

---

## Phase 4: Dynamic Context Distribution (`packages/cli` & `apps/extension`)
**Goal:** Build the mechanism to distribute enterprise standards directly to native IDEs.

- [ ] **CLI Rewrite (Bun):** Replace the Python CLI with a Bun-compiled executable.
- [ ] **`orch sync` Command:** Build the command that pulls active constraints via Hono RPC and dynamically overwrites local `.github/copilot-instructions.md` and `.cursorrules` files.
- [ ] **Extension Background Sync:** Hook the VS Code extension into the same logic to update constraints silently when the workspace opens.

---

## Phase 5: Deterministic Enforcement (`apps/action`)
**Goal:** Solidify the CI/CD pipeline as the strict compliance gate.

- [ ] **Update PR Action:** Point the GitHub action to the new `packages/core` Hono RPC endpoint.
- [ ] **Strict Blocking:** Implement hard failure states. If the `orch_core` review endpoint flags a critical constraint violation (e.g., raw SQL instead of Drizzle), the action must return a non-zero exit code to block the merge.

---

## Phase 6: Agentic Guardrails (Future)
**Goal:** Build the firewall for autonomous AI agents.

- [ ] **MCP (Model Context Protocol) Integration:** Allow Orch to act as an MCP server/proxy, dynamically granting or denying filesystem/API access to agents based on enterprise policy.
- [ ] **Token Budgets:** Hard limit token expenditures per agent task, actively cutting off OpenRouter streams if a runaway agent exceeds its budget.
