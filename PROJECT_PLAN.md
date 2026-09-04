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

## Phase 4: Advanced Evaluator (Completed)
**Goal:** Enhance the AI evaluator to guarantee deterministic, highly-accurate code reviews.

- [x] **Critic/Judge Reflection Loop:** Update `src/ai/evaluator.ts` to implement a multi-pass evaluation where the LLM critiques its own output against constraints before returning a final pass/fail judgment.
- [x] **Few-Shot Prompting:** Inject "Good/Bad" examples into the RAG context to force the evaluator to mimic organizational standards precisely.

---

## Phase 5: The Dashboard Connection (`apps/dashboard`) (Completed)
**Goal:** Migrate the Next.js frontend to natively consume the new core via Hono RPC.

- [x] **RPC Client Integration:** Replace raw `fetch()` calls with the `hc` (Hono Client).
- [x] **Auth Sync:** Ensure Clerk authentication tokens are properly passed through Hono RPC middleware.
- [x] **Feature Parity:** Verify constraint management works seamlessly.

---

## Phase 6: Dynamic Context Distribution (`apps/extension`) (Current Focus)
**Goal:** Distribute enterprise standards directly to native IDEs.

- [x] **`orch sync` Command:** Build the CLI command that dynamically overwrites local `.github/copilot-instructions.md` and `.cursorrules` files.
- [ ] **Extension Background Sync:** Hook the VS Code extension into the same logic to update constraints silently.

---

## Phase 7: The Orch Marketplace & Skill Registry (Active Planning)
**Goal:** Build the community and verified skill ecosystem with flexible governance.

- [ ] **Schema & Migrations (`packages/core`):**
  - Add `public_skills`, `public_skill_rules`, `project_skill_subscriptions`.
  - Add `precedence_mode` enum flag (`'private_overrules' | 'strict_union' | 'public_overrules'`).
  - Add optional monetization scaffolding (`is_paid`, `price_cents`, `lemon_squeezy_variant_id`).
- [ ] **Unified Multi-Source RAG (`retriever.ts`):**
  - Index public skill rule chunks into `constraint_chunks`.
  - Update `retrieveChunks` to retrieve relevant chunks across both private constraints and active subscribed skills.
- [ ] **Marketplace UI (`apps/dashboard`):**
  - Discover page with search, category filtering, and verified badges.
  - Skill Detail view with rule preview and few-shot examples.
  - Subscription modal allowing project targeting and rule exclusion toggles.
- [ ] **Skill Creation Pipeline:**
  - Visual builder in dashboard for new skill packs.
  - 1-click "Promote Private Constraint to Public Skill".
  - CLI `orch publish` for Git-based authoring via `orch-skill.yaml`.

---

## Phase 8: Agentic Chat, Real-Time Research & Message Queues
**Goal:** Upgrade chat into an ultra-fast, transparent research assistant with resilient background job queuing.

- [ ] **Spec-Compliant Message Queue Architecture (`job_queue`):**
  - Implement zero-new-infra PostgreSQL queue via `FOR UPDATE SKIP LOCKED` in `packages/core`.
  - **AI Chat Queue:** Asynchronous execution for deep web research & document synthesis (eliminates 60s gateway timeouts).
  - **MCP Burst Queue:** Token-bucket concurrency limiter for autonomous agents firing rapid `evaluate_code` and `fetch_policy` tool calls.
  - Automatic exponential backoff and retries on LLM provider 429 rate limits.
- [ ] **Chat Performance & Latency Optimization:**
  - Cache MCP tool definitions in memory to eliminate per-turn SSE connection handshakes.
  - Optimize streaming pipeline and model routing for low-latency reasoning.
- [ ] **Live Execution Step Badges:**
  - Stream animated intermediate states (`Searching constraints...`, `Querying web...`, `Analyzing docs...`).
- [ ] **Agentic Web Search & Research Tool:**
  - Integrate real-time web search tool (Tavily/Brave API) returning structured URLs, titles, and snippets.
- [ ] **Used Resources & Sources Drawer/Modal:**
  - Render compact citation pills at the bottom of assistant messages (`[🛡️ 2 Constraints]`, `[🌐 3 Web Sources]`).
  - Interactive modal displaying exact matched constraint chunks and clickable source URLs with favicons.

---

## Phase 9: Enterprise Ops, Monitoring & Sentinel Health
**Goal:** Provide full visibility, compliance metrics, and health telemetry.

- [ ] **Sentinel Health & Webhook Inspector:**
  - Self-healing diagnostics for GitHub App webhooks, HMAC signature verification, and repository bindings.
- [ ] **Super Admin Ops Dashboard (`/admin/ops`):**
  - Global token consumption, provider latency percentiles (p50/p95/p99), and webhook event delivery logs.
  - DLP redaction audit log and marketplace skill moderation queue.
- [ ] **Team Lead Compliance Dashboard (`/team/monitoring`):**
  - PR pass rate analytics (first-pass clean vs. Sentinel blocked).
  - Heatmap of most frequently violated constraints across repositories.
  - Developer & agent compliance breakdown.
  - 1-click emergency rule exemption approval workflow.

---

## Phase 10: Web3 On-Chain Agent Firewall & Blockchain Grant Readiness
**Goal:** Position Orch as the official Policy-as-Code & Attestation Firewall for Autonomous On-Chain AI Agents.

- [ ] **Grant Strategy & Narrative ("Policy-as-Code for Autonomous Crypto Agents"):**
  - Target Grants: **Base Ecosystem Fund**, **Arbitrum Foundation AI Track**, **Optimism RetroPGF**, **Ethereum Foundation Dev Tooling**, **Solana Foundation AI Grants**.
  - Core Moat: Autonomous agents executing transactions or deploying contracts cannot sign or submit without Orch policy compliance.
- [ ] **Web3 & Smart Contract Verified Skill Packs:**
  - Curate official skill packs: `@openzeppelin/erc20-guardrails`, `@consensys/solidity-security`, `@ethereum/safe-multisig-policies`.
- [ ] **On-Chain Policy Attestations (EAS):**
  - Mint cryptographic attestations (Ethereum Attestation Service on Base/Arbitrum) when code/PRs pass Sentinel evaluation.
- [ ] **Decentralized Skill Integrity:**
  - Pin skill pack manifests and rule chunks to IPFS/Arweave with author cryptographic signatures.

