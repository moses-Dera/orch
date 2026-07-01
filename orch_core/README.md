# orch-core

> The governance engine for Orch — enforces your org's engineering standards on every AI interaction.

---

## What it does

- Prompt interception and constraint enforcement
- Multi-tenant org, team, and member management
- Model policy: Enforced / Allowlist / Open
- Developer personal API keys — used per-request, never stored
- Session memory with context window management and summarization
- Streaming responses with automatic model fallback chain
- Code review against org constraints with structured findings
- RAG-powered constraint retrieval via pgvector
- Constraint health scoring and override tracking
- Per-developer audit log, session drill-down, and cost attribution
- Rate limiting, injection defense, canary tokens, and credential encryption
- GitHub App webhook handler — auto-installs review workflow on all repos

---

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — set DATABASE_URL (PostgreSQL) and at least one LLM key

prisma generate
python migrate.py
python seed.py
uvicorn main:app --reload
```

API docs: `http://127.0.0.1:8000/docs`

---

## Requirements

- Python 3.10+
- PostgreSQL with pgvector extension
- Redis (optional — caching degrades gracefully without it)

---

## Environment variables

See `.env.example` for all available configuration options.

---

## License

MIT
