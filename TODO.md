# Orch — Feature Backlog & TODO

> Last Updated: 2025

---

## In Progress

- [ ] Deployment — orch_core needs a live URL before anything works for real users (Railway recommended)
- [ ] GitHub App — webhook handler built, dashboard connect page built — needs GitHub App registration and deployment
- [ ] `orch init` — one command: detects git remote, registers repo, installs pre-commit hook
- [ ] VS Code extension — auto-configure from GitHub identity, silent enforcement, right-click audit

---

## Up Next

- [ ] Coverage metric — dashboard shows % of PRs reviewed per developer and repo
- [ ] Compliance export — `GET /api/v1/audit/export` returns CSV/JSON for SOC2 auditors
- [ ] Pre-commit hook — optional power-user layer, reviews staged diff before commit
- [ ] `orch init` global default — `~/.orch/config` fallback for projects without local config

---

## Planned

- [ ] Billing / Stripe — enforce tier limits via payment, subscription management
- [ ] SSO — Okta, Azure AD
- [ ] Webhook / event system — notify customer systems on constraint violations
- [ ] On-premise deployment — Docker Compose + Helm chart
- [ ] Multi-region — EU data residency for GDPR customers
- [ ] SOC2 Type I certification
- [ ] HIPAA BAA agreements
- [ ] Constraint marketplace — teams share and fork constraint profiles
- [ ] AI Model Intelligence System — monitors new model releases, notifies orgs

---

## Completed

### orch_core
- [x] Full orchestration pipeline — streaming SSE, standard response
- [x] Parallel pipeline phases — session + domain detection in parallel, model + constraint in parallel
- [x] RAG constraint retrieval — pgvector semantic search, chunks indexed on save, fallback to full constraint
- [x] Embedding service — litellm embeddings with Redis cache
- [x] Constraint indexer — chunks + embeds on upsert, index-all on startup
- [x] Code review endpoint — structured findings, severity, line numbers, suggested fixes
- [x] Multi-tenancy — Organization, Team, Member, ApiKey
- [x] One person, multiple orgs — clerkId unique per team not globally
- [x] Git remote registration — register-repo and resolve-repo endpoints
- [x] Three-tier model policy — Enforced / Allowlist / Open
- [x] Personal key isolation — allowlist enforced even with developer's own key
- [x] Credential encryption — Fernet (AES-128 + HMAC) local, AWS KMS production
- [x] Error redaction — API keys stripped from all logs and error responses
- [x] Context window management — tiktoken budgeting + conversation summarization
- [x] Constraint health scoring — override tracking, 0-100 score, status labels, recommendations
- [x] Background health recomputation — fires after every pipeline execution
- [x] Per-developer audit log — sessions attributed to members, token breakdown
- [x] Session drill-down — GET /audit/me, GET /audit/{session_id} with full message thread
- [x] Audit N+1 fix — bulk message fetch, grouped in memory
- [x] Rate limiting — Redis sliding window, tier-based
- [x] Redis double-checked lock — race condition fix on first connection
- [x] Prompt injection defense — regex patterns + unicode normalisation
- [x] Canary tokens — system prompt leak detection
- [x] Request size limit + content-type enforcement middleware
- [x] Security headers middleware
- [x] Model fallback chain — automatic failover, parallel fallback fetch
- [x] Response caching — Redis, 1-hour TTL
- [x] Constraint caching — Redis, 5-minute TTL
- [x] Domain detection — fast LLM classification, temperature 0
- [x] Per-model constraint variants — GPT, Claude, Gemini tuning
- [x] Constraint version pinning per session
- [x] Token logging — input/output per message
- [x] Cost attribution — per developer, per model, per team
- [x] Model registry — known models across providers
- [x] DB migrations
- [x] Seed script
- [x] Structured logging — readable dev, JSON production
- [x] Unit tests

### orch_dashboard
- [x] Sign in / sign up — Clerk for auth only, all product data in Orch
- [x] Custom Clerk appearance — matches design system, no Clerk card chrome
- [x] Split-screen auth layout — branded left panel, widget right
- [x] Onboarding wizard — create org, model policy, get API key
- [x] Multi-org support — create additional orgs, switch from header
- [x] Org switcher — dropdown, one-click switch, create new org inline
- [x] httpOnly cookie for API key — zero DB lookup per proxy request
- [x] Active org cookie — correct context after org switch
- [x] Route guard — admin routes protected against direct URL navigation
- [x] Dark mode — system preference, toggle in header, persisted to localStorage, no flash
- [x] Home — getting started checklist (new teams), stats + activity (active teams)
- [x] Chat — streaming SSE, bubble alignment, neutral user bubble colour
- [x] Chat — no-model banner with guided action for admin and member
- [x] Audit — no-model banner, consistent with chat
- [x] Sessions — fixed (was using Clerk metadata, now uses Orch /me), two-panel layout with thread
- [x] Audit Log — per-developer drill-down, session list, full message thread
- [x] Team — invite members, role badges, invite link generation
- [x] Constraints — create/edit/delete, per-model variants, health scores, sandbox
- [x] Models — add/remove, policy display, actionable empty state with provider examples
- [x] Analytics — token and session charts by developer
- [x] Docs — built-in documentation, developer and admin views, progress tracker
- [x] Settings — API key display, fixed to use useMe() not Clerk metadata
- [x] Error messages — FastAPI detail.message correctly surfaced to toasts
- [x] React Query stale times — status/role cached for session, models/health 5 min
- [x] useMe staleTime: Infinity — role never refetched mid-session

### orch_cli
- [x] login / logout
- [x] ask — streaming prompt
- [x] chat — interactive multi-turn session
- [x] audit — review a local file
- [x] models — list approved models
- [x] status — org and team info
- [x] health — constraint health scores
- [x] override — log a constraint override

### orch_action
- [x] action.yml — inputs, outputs, branding
- [x] Diff parser — unified diff → per-file chunks with line number mapping
- [x] Review client — parallel file reviews via /api/v1/review
- [x] Comment poster — inline PR comments + summary comment (updates existing)
- [x] Ignore patterns — glob matching to skip files
- [x] Merge blocking — configurable fail on critical / warning
- [x] Example workflow — two-file setup (action.yml + workflow) for any repo

### orch_extension
- [x] Extension scaffold and activation
- [x] Status bar — active constraint profile
- [x] Config resolution — reads .orch/config from workspace
- [x] API client — connected to orch_core
