# Contributing to orch_core

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — set DATABASE_URL (PostgreSQL) and at least one LLM key

prisma generate
prisma db push
python seed.py
uvicorn main:app --reload
```

API docs: `http://127.0.0.1:8000/docs`

## Running tests

```bash
pytest tests/
```

## Environment

- Python 3.10+
- PostgreSQL (required — no SQLite)
- Redis (optional — caching degrades gracefully without it)

## Pull requests

- Keep PRs focused — one feature or fix per PR
- Add tests for new endpoints and core logic
- Update `DOCUMENTATION.md` if you change API contracts
- Run `prisma generate` after schema changes

## Reporting security issues

See [SECURITY.md](SECURITY.md).
