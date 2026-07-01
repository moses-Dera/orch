# orch-review-action

> Automated code review on every PR — enforces your org's engineering constraints regardless of which AI wrote the code.

---

## What It Does

On every pull request:

1. Fetches the PR diff from GitHub
2. Reviews each changed file against your org's constraint profiles in parallel
3. Posts findings as inline PR review comments with exact line numbers
4. Posts a summary comment with issue counts by severity
5. Optionally blocks merge on critical findings

The developer sees findings directly in the PR. No dashboard visit required. No workflow change.

---

## Setup

**1. Add two repository secrets:**

```
Repository → Settings → Secrets → Actions → New secret

Name: ORCH_API_KEY
Value: orch_xxx  (from your Orch dashboard under Settings)

Name: ORCH_API_URL
Value: https://your-orch-instance.com  (wherever you deployed orch_core)
```

**2. Create `.github/workflows/orch.yml`:**

```yaml
name: Orch Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  orch-review:
    name: Review against org constraints
    runs-on: ubuntu-latest
    steps:
      - name: Orch Review
        uses: orch-dev/review-action@v1
        with:
          api_key: ${{ secrets.ORCH_API_KEY }}
          api_url: ${{ secrets.ORCH_API_URL }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

That's it. Every PR is now reviewed automatically.

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `api_key` | Yes | — | Your Orch API key (`orch_xxx`) |
| `api_url` | Yes | — | Your Orch API URL (wherever you deployed orch_core) |
| `fail_on_critical` | No | `true` | Block merge on critical findings |
| `fail_on_warning` | No | `false` | Block merge on warnings |
| `model` | No | `auto` | Model to use (defaults to org config) |
| `domain` | No | `auto` | Constraint domain (auto-detected per file) |
| `max_files` | No | `20` | Max files to review per PR |
| `ignore_patterns` | No | `*.md,*.txt,*.json,...` | Glob patterns to skip |

---

## Outputs

| Output | Description |
|---|---|
| `total_issues` | Total issues found |
| `critical_count` | Critical issues found |
| `warning_count` | Warnings found |
| `files_reviewed` | Files reviewed |
| `clean` | `true` if no issues |

---

## Examples

**Block merge on any finding:**
```yaml
- uses: orch-dev/review-action@v1
  with:
    api_key: ${{ secrets.ORCH_API_KEY }}
    api_url: ${{ secrets.ORCH_API_URL }}
    fail_on_critical: "true"
    fail_on_warning: "true"
```

**Review only backend code:**
```yaml
- uses: orch-dev/review-action@v1
  with:
    api_key: ${{ secrets.ORCH_API_KEY }}
    api_url: ${{ secrets.ORCH_API_URL }}
    domain: "backend"
    ignore_patterns: "*.md,*.json,tests/**,migrations/**"
```

**Use findings in subsequent steps:**
```yaml
- name: Orch Review
  id: orch
  uses: orch-dev/review-action@v1
  with:
    api_key: ${{ secrets.ORCH_API_KEY }}
    api_url: ${{ secrets.ORCH_API_URL }}

- name: Print summary
  run: |
    echo "Files reviewed: ${{ steps.orch.outputs.files_reviewed }}"
    echo "Issues found: ${{ steps.orch.outputs.total_issues }}"
    echo "Critical: ${{ steps.orch.outputs.critical_count }}"
```

---

## What Developers See

**Inline comment on a specific line:**

```
🔴 Plain text password comparison

Password is compared without hashing. This is a critical security vulnerability.

Suggested fix:
  use bcrypt.checkpw(password.encode(), stored_hash)

Constraint: `backend` · Orch
```

**Summary comment on the PR:**

```
## Orch Code Review

Found 3 issues across 2 files.

| Severity | Count |
|---|---|
| 🔴 Critical | 1 |
| 🟡 Warning  | 2 |

### Findings by file

<details>
<summary>src/auth.py — 2 issues</summary>
...
</details>
```

---

## How It Works

1. Action triggers on `pull_request` events
2. Fetches the full PR diff via GitHub API
3. Parses diff into per-file chunks with line number mapping
4. Filters files matching ignore patterns
5. Calls `POST /api/v1/review` for each file in parallel
6. Maps finding line numbers back to diff positions for inline comments
7. Posts inline comments via GitHub Pull Request Review API
8. Posts or updates a summary comment (replaces previous Orch comment)
9. Sets check status based on `fail_on_critical` / `fail_on_warning` config

---

## Building from Source

```bash
cd orch_action
npm install
npm run build
```

The compiled action is in `dist/index.js`.

---

## Requirements

- Orch account with at least one model configured
- `ORCH_API_KEY` repository secret
- `pull-requests: write` permission (for posting comments)
- `contents: read` permission (for reading the diff)
