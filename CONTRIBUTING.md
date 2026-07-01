# Contributing to Orch

Thank you for your interest in contributing.

---

## Running locally

### orch_core

```bash
cd orch_core
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — set DATABASE_URL and at least one LLM key

prisma generate
prisma db push
python seed.py
uvicorn main:app --reload
```

### orch_dashboard

```bash
cd orch_dashboard
npm install

cp .env.local.example .env.local
# Edit .env.local — set Clerk keys and ORCH_API_URL

npm run dev
```

### orch_cli

```bash
cd orch_cli
pip install typer rich httpx
python orch.py login
```

### orch_action

```bash
cd orch_action
npm install
npm run build
```

---

## Project structure

```
orch_core/       FastAPI backend — governance engine
orch_dashboard/  Next.js dashboard — CTO control panel
orch_extension/  VS Code extension — developer tooling
orch_action/     GitHub Action — automated PR reviews
orch_cli/        Developer CLI
```

---

## Pull requests

- Keep PRs focused — one feature or fix per PR
- Add tests for new backend functionality
- Run `npx tsc --noEmit` before submitting extension/action changes
- Update `DOCUMENTATION.md` if you change API contracts

---

## Reporting issues

Use GitHub Issues. Include:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Environment (OS, Python version, Node version)

---

## Security vulnerabilities

Do not open a public issue for security vulnerabilities.
See [SECURITY.md](SECURITY.md) for responsible disclosure.
