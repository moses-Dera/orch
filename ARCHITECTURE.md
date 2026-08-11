# Orch — Architecture & Product Design

> Last updated: August 2026

---

## What Orch Is

Orch is the **Centralized Control Plane for Policy-as-Code**. 

It sits between developers and their AI tools—dynamically distributing enterprise standards to local IDEs, providing a zero-latency proxy for autonomous agents, and enforcing strict, deterministic compliance gates in CI/CD.

**Whether code is written by a junior developer or an autonomous agent, Orch ensures your standards travel with them.**

---

## The Core Insight

While other tools focus on intercepting generic prompts or reviewing code *after* it's merged, Orch operates on three pillars:

1. **High-Performance RAG:** Using native PostgreSQL `pgvector` and Gemini embeddings, Orch semantically matches developer queries to architectural constraints in milliseconds.
2. **Deterministic Enforcement:** Because LLMs are probabilistic, injecting constraints isn't enough. We deterministically block non-compliant PRs via our strict Evaluator.
3. **Agentic Guardrails:** For autonomous agents, Orch acts as the proxy firewall, enforcing constraints and reviewing diffs via the Model Context Protocol (MCP).

---

## System Architecture

```mermaid
flowchart TD
    subgraph Dashboard
        web[Next.js Dashboard\nManage Constraints & Settings]
    end

    subgraph Core API (Bun / Hono)
        proxy[Streaming Proxy]
        eval[Diff Evaluator]
        rag[pgvector RAG Search]
        db[(PostgreSQL\nConstraints + Vectors)]
        
        proxy --> rag
        eval --> rag
        rag --> db
    end

    subgraph Clients
        ide[VS Code Extension\nHuman Devs]
        mcp[MCP Server\nAutonomous Agents]
        ci[GitHub Actions\nCI/CD]
    end

    subgraph Providers
        openrouter[OpenRouter\n(LLM Inference)]
        gemini[Google Gemini\n(Embeddings)]
    end

    %% Client flows
    web --> db
    ide -->|/proxy| proxy
    mcp -->|/review| eval
    ci -->|/review| eval

    %% Core to Providers
    proxy --> openrouter
    eval --> openrouter
    rag --> gemini
```

---

## Technical Stack Deep Dive

### 1. The Monorepo
Orch uses a **Bun** monorepo (via `pnpm` workspaces) to guarantee zero type drift between the core API, the CLI tools, and the dashboard. 

### 2. The Runtime (Bun & Hono)
We require extreme execution speed and low latency. Python/FastAPI was discarded in favor of **Bun** and **Hono**. This stack delivers sub-millisecond routing and eliminates the need for heavy, cold-starting backend infrastructure.

### 3. The Data Layer (Drizzle + pgvector)
We use **Drizzle ORM** for lightweight, SQL-like queries against **PostgreSQL**.
To support our RAG search, we enabled the `pgvector` extension and configured it strictly for `768` dimensions to match our Google Gemini embedding output. We utilize an `ivfflat` index for lightning-fast cosine similarity searches.

### 4. The Intelligence Layer
- **OpenRouter** acts as the primary LLM gateway for the Streaming Proxy and Evaluator, preventing vendor lock-in.
- **Google Gemini** (`text-embedding-004`) powers the embedding pipeline natively because of its high free-tier limits and excellent semantic matching for code context.

---

## The Agentic Future (Model Context Protocol)
Unlike human developers who need immediate streaming text, autonomous agents require structured, deterministic boundaries. 

The `orch-mcp` CLI tool exposes a standard **Model Context Protocol** `stdio` server. Agents attach to this server and use exposed tools like `evaluate_code` and `fetch_policy` to ensure their output complies with enterprise architecture *before* they commit.
