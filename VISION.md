# Orch: The Centralized Control Plane for AI-Native Engineering

> **Vision:** We don't build the AI; we build the rails it runs on. Orch ensures that whether code is written by a junior developer or an autonomous agent, it strictly adheres to your enterprise standards.

---

## The Market Reality (2026)

The era of questioning *whether* to use AI is over. Today, the challenge is governance. As engineering teams shift from simple AI autocomplete to autonomous agentic workflows, traditional code review is no longer sufficient.

Existing tools fail to provide enterprise-level governance:
1. **Context is fragmented:** Developers manually manage local `.copilot-instructions.md` or `.cursorrules` files. There is no centralized source of truth.
2. **LLMs are nondeterministic:** Injecting a prompt constraint does not guarantee the AI will follow it. 
3. **Agentic Risk:** Autonomous agents execute code without strict boundary constraints, posing security and cost risks.

---

## The Orch Solution

Orch moves beyond simple prompt interception to become the **Centralized Control Plane for Policy-as-Code**. 

### 1. Dynamic Context Distribution
Orch acts as the single source of truth for engineering standards. CTOs define architectural constraints, security policies, and tech stack rules in the Orch Dashboard. The Orch CLI and VS Code Extension dynamically sync these constraints to every developer's local environment, seamlessly injecting them into native tools like Copilot and Cursor.

### 2. Deterministic CI/CD Enforcement
Because LLMs hallucinate, interception is not enough. Orch serves as the ultimate deterministic gatekeeper. `orch_action` runs in your CI/CD pipeline, grading AI-generated PRs against the exact same constraints injected in the IDE. If an AI hallucinates or ignores a critical security rule, Orch blocks the merge.

### 3. Agentic Guardrails
As autonomous agents take over routine engineering tasks, Orch acts as the firewall. Through MCP (Model Context Protocol) awareness, Orch restricts file system access, enforces token budgets, and ensures agents operate strictly within their assigned roles.

---

## The Architecture & Tech Stack

To achieve zero-latency proxying and seamless monorepo execution, Orch is built on a next-generation stack:

*   **The Monorepo:** Managed via `pnpm` workspaces, ensuring zero type drift between the dashboard, backend, and CLI.
*   **The Runtime:** **Bun**. Delivering sub-5ms cold starts and replacing Python/Node.js for extreme execution speed.
*   **The Engine:** **Hono**. An ultrafast web framework powering the core API, utilizing **Hono RPC** for end-to-end type safety without heavy code generation.
*   **The Data Layer:** **Drizzle ORM** paired with **PostgreSQL** and `pgvector`. This lightweight, SQL-like ORM provides raw performance for multi-tenant routing and semantic RAG constraint retrieval.

Orch is not an AI provider, nor is it just a linter. It is the mandatory governance middleware that makes enterprise AI development safe, standardized, and auditable.
