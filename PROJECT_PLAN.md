# Orch — Project Plan & Roadmap

This document outlines the engineering plan to execute the strategic vision: Orch as the Centralized Control Plane for Policy-as-Code.

---

## Phase 1: Foundation & Monorepo Setup (Completed)
- [x] Initialize `pnpm` workspace (`pnpm-workspace.yaml`).
- [x] Migrate `orch_dashboard`, `orch_action`, and `orch_extension` into `apps/`.
- [x] Create `packages/types`, `packages/core`, and `packages/cli` scaffolding.

---

## Phase 2: Core Rewrite (`packages/core`) (Completed)
**Goal:** Replace the legacy Python FastAPI backend with an ultra-low-latency Bun + Hono API.

- [x] **Setup Hono + Bun:** Initialize the base web server with standard middleware.
- [x] **Database Migration (Drizzle):** Translate schema to Drizzle ORM.
- [x] **pgvector RAG Integration:** Enable the `pgvector` extension and implement the Cosine Similarity search with Google Gemini 768-dimension embeddings for constraints.
- [x] **Proxy Endpoints:** Rebuild the `/v1/chat/completions` REST endpoints to proxy OpenRouter with streaming support.

---

## Phase 3: Agentic Guardrails (`packages/cli`) (Completed)
**Goal:** Build the firewall for autonomous AI agents.

- [x] **MCP (Model Context Protocol) Integration:** Allow Orch to act as an MCP server (`orch mcp`), dynamically granting or denying architectural guidelines (`fetch_policy`) and evaluating code diffs (`evaluate_code`).
- [ ] **Token Budgets:** Hard limit token expenditures per agent task.

---

## Phase 4: Advanced Evaluator (Current Focus)
**Goal:** Enhance the AI evaluator to guarantee deterministic, highly-accurate code reviews.

- [ ] **Critic/Judge Reflection Loop:** Update `src/ai/evaluator.ts` to implement a multi-pass evaluation where the LLM critiques its own output against constraints before returning a final pass/fail judgment.
- [ ] **Few-Shot Prompting:** Inject "Good/Bad" examples into the RAG context to force the evaluator to mimic organizational standards precisely.

---

## Phase 5: The Dashboard Connection (`apps/web`) (Pending)
**Goal:** Migrate the Next.js frontend to natively consume the new core via Hono RPC.

- [ ] **RPC Client Integration:** Replace raw `fetch()` calls with the `hc` (Hono Client).
- [ ] **Auth Sync:** Ensure Clerk authentication tokens are properly passed through Hono RPC middleware.
- [ ] **Feature Parity:** Verify constraint management works seamlessly.

---

## Phase 6: Dynamic Context Distribution (`apps/extension`) (Pending)
**Goal:** Distribute enterprise standards directly to native IDEs.

- [ ] **`orch sync` Command:** Build the CLI command that dynamically overwrites local `.github/copilot-instructions.md` and `.cursorrules` files.
- [ ] **Extension Background Sync:** Hook the VS Code extension into the same logic to update constraints silently.
