# Orch

> **The Centralized Control Plane for AI-Native Engineering**

Orch is a lightning-fast governance layer and MCP Server that sits between your developers (or autonomous agents) and the AI models they use. It natively enforces your organization's engineering standards on every line of AI-assisted code.

Whether code is written by a junior developer via VS Code or an autonomous agent via Claude Desktop, Orch ensures your standards travel with them.

---

## The Stack

Orch is built for extreme speed and easy self-hosting:
- **Runtime:** Bun 
- **Structure:** Monorepo (`pnpm` workspaces via Bun)
- **API Engine:** Hono (Sub-millisecond Edge routing)
- **Database:** PostgreSQL + `pgvector`
- **ORM:** Drizzle
- **AI Gateway:** OpenRouter
- **Embeddings:** Google Gemini (`text-embedding-004`)

---

## Core Capabilities

### 1. Model Context Protocol (MCP) Server
Orch exposes a native MCP server (`packages/cli/src/mcp.ts`) that autonomous agents can connect to via `stdio`. This acts as a strict firewall for agents:
- Agents must fetch architectural constraints before modifying files.
- Agents can submit code diffs to Orch for a strict JSON evaluation against organizational policies.

### 2. High-Performance RAG (Retrieval-Augmented Generation)
Instead of stuffing massive lists of rules into prompts, Orch uses native `pgvector` semantic search. When an agent or IDE makes a request, Orch instantly chunks the query, embeds it via Gemini, and retrieves only the **Top 6 most relevant constraints** using cosine distance (`<=>`), saving huge token costs and minimizing latency.

### 3. IDE Streaming Proxy
For real-time developers, Orch acts as a transparent proxy (`/proxy`). It intercepts requests from the IDE, injects the RAG constraints, and streams the OpenRouter response straight back to the editor with zero perceived latency.

### 4. GitHub PR Evaluator
A built-in evaluator (`/review`) can act as a CI/CD webhook, analyzing incoming Pull Requests against your exact organizational constraints and blocking merges if the AI hallucinated or broke rules.

---

## Repository Structure

```
orch/
├── packages/
│   ├── core/      # Hono API backend, DB schema, RAG pipeline, AI Evaluator
│   └── cli/       # The MCP Server and Developer CLI tools
└── apps/
    └── web/       # (WIP) Next.js Dashboard for Admins to manage constraints
```

---

## Quickstart

### Prerequisites
- [Bun](https://bun.sh/)
- PostgreSQL (must have `pgvector` installed at the OS level)

### 1. Database Setup
Ensure your local PostgreSQL server is running and `pgvector` is installed on your machine (`sudo apt-get install postgresql-18-pgvector` or equivalent).

```bash
# Inside packages/core
bun install

# Configure your environment
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY, GEMINI_API_KEY, and DATABASE_URL

# Push schema and create tables
bun run migrate

# Enable the vector extension
psql $DATABASE_URL -f drizzle/0001_enable_pgvector.sql
```

### 2. Run the API Engine
```bash
cd packages/core
bun run dev
```
API runs on `http://127.0.0.1:3001`

### 3. Run the MCP Server
To expose Orch to autonomous agents (like Claude Desktop or Cursor):
```bash
cd packages/cli
bun install
bun run build
bun run orch mcp
```
