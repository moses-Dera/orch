import hmac
import hashlib
import base64
import asyncio
from fastapi import APIRouter, Request, HTTPException, Header, Depends
from typing import Optional
from app.db.client import db
from app.api.deps import get_team
from app.config import get_settings
from app.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()

# The workflow file Orch commits to every covered repo
WORKFLOW_CONTENT = """\
name: Orch Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  contents: read
  pull-requests: write
jobs:
  orch-review:
    runs-on: ubuntu-latest
    steps:
      - uses: orch-dev/review-action@v1
        with:
          api_key: ${{ secrets.ORCH_API_KEY }}
          api_url: ${{ secrets.ORCH_API_URL }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
"""

WORKFLOW_PATH = ".github/workflows/orch.yml"
WORKFLOW_MESSAGE = "chore: add Orch code review workflow"


def _verify_signature(body: bytes, signature: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature."""
    if not settings.github_webhook_secret:
        logger.warning("GITHUB_WEBHOOK_SECRET not set — skipping signature verification")
        return True
    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def _get_github_client(installation_id: int):
    """Create an authenticated GitHub API client for an installation."""
    try:
        from github import GithubIntegration, Github
        key_pem = base64.b64decode(settings.github_app_private_key).decode()
        integration = GithubIntegration(
            int(settings.github_app_id),
            key_pem
        )
        token = integration.get_access_token(installation_id).token
        return Github(token)
    except Exception as e:
        logger.error(f"Failed to create GitHub client: {e}")
        raise


async def _commit_workflow(gh_client, repo_full_name: str) -> bool:
    """Commit the Orch workflow file to a repo. Returns True if committed."""
    try:
        import asyncio
        loop = asyncio.get_event_loop()

        def _do_commit():
            repo = gh_client.get_repo(repo_full_name)
            # Check if file already exists
            try:
                existing = repo.get_contents(WORKFLOW_PATH)
                logger.info(f"Workflow already exists in {repo_full_name} — skipping")
                return True
            except Exception:
                pass  # file doesn't exist, proceed

            # Get default branch
            default_branch = repo.default_branch
            try:
                ref = repo.get_git_ref(f"heads/{default_branch}")
            except Exception:
                logger.warning(f"Could not get ref for {repo_full_name} — skipping")
                return False

            repo.create_file(
                path=WORKFLOW_PATH,
                message=WORKFLOW_MESSAGE,
                content=WORKFLOW_CONTENT,
                branch=default_branch
            )
            logger.info(f"Workflow committed to {repo_full_name}")
            return True

        return await loop.run_in_executor(None, _do_commit)
    except Exception as e:
        logger.error(f"Failed to commit workflow to {repo_full_name}: {e}")
        return False


async def _handle_installation_created(payload: dict, org_id: str):
    """Handle installation.created — store record and commit workflow to all repos."""
    installation = payload["installation"]
    installation_id = installation["id"]
    account = installation["account"]
    repos = payload.get("repositories", [])

    repo_names = [r["full_name"] for r in repos]

    # Store installation record
    existing = await db.githubinstallation.find_first(
        where={"installationId": installation_id}
    )
    if existing:
        await db.githubinstallation.update(
            where={"id": existing.id},
            data={"active": True, "repos": repo_names, "orgId": org_id}
        )
        record = existing
    else:
        record = await db.githubinstallation.create(data={
            "installationId": installation_id,
            "githubOrgName": account["login"],
            "githubOrgId": account["id"],
            "orgId": org_id,
            "repos": repo_names,
            "active": True,
        })

    logger.info(f"Installation created id={installation_id} org={account['login']} repos={len(repo_names)}")

    # Commit workflow to all repos in background
    if settings.github_app_id and settings.github_app_private_key:
        asyncio.create_task(_commit_workflows_to_repos(installation_id, repo_names, record.id))


async def _commit_workflows_to_repos(installation_id: int, repo_names: list[str], record_id: str):
    """Background task — commit workflow file to all repos."""
    try:
        gh = _get_github_client(installation_id)
        results = await asyncio.gather(*[
            _commit_workflow(gh, name) for name in repo_names
        ], return_exceptions=True)

        committed = sum(1 for r in results if r is True)
        logger.info(f"Workflow committed to {committed}/{len(repo_names)} repos")

        await db.githubinstallation.update(
            where={"id": record_id},
            data={"workflowCommitted": True}
        )
    except Exception as e:
        logger.error(f"Workflow commit batch failed: {e}")


async def _handle_installation_deleted(payload: dict):
    """Handle installation.deleted — mark inactive."""
    installation_id = payload["installation"]["id"]
    await db.githubinstallation.update_many(
        where={"installationId": installation_id},
        data={"active": False}
    )
    logger.info(f"Installation deleted id={installation_id}")


async def _handle_repositories_added(payload: dict):
    """Handle installation_repositories.added — commit workflow to new repos."""
    installation_id = payload["installation"]["id"]
    added = [r["full_name"] for r in payload.get("repositories_added", [])]

    record = await db.githubinstallation.find_first(
        where={"installationId": installation_id}
    )
    if not record:
        return

    updated_repos = list(set(list(record.repos or []) + added))
    await db.githubinstallation.update(
        where={"id": record.id},
        data={"repos": updated_repos}
    )

    if settings.github_app_id and settings.github_app_private_key and added:
        asyncio.create_task(_commit_workflows_to_repos(installation_id, added, record.id))


async def _handle_repositories_removed(payload: dict):
    """Handle installation_repositories.removed — remove from coverage list."""
    installation_id = payload["installation"]["id"]
    removed = {r["full_name"] for r in payload.get("repositories_removed", [])}

    record = await db.githubinstallation.find_first(
        where={"installationId": installation_id}
    )
    if not record:
        return

    updated_repos = [r for r in (record.repos or []) if r not in removed]
    await db.githubinstallation.update(
        where={"id": record.id},
        data={"repos": updated_repos}
    )


@router.post("/webhook", summary="GitHub App webhook receiver", include_in_schema=False)
async def github_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None),
    x_github_event: Optional[str] = Header(None),
    x_orch_org_id: Optional[str] = Header(None),
):
    """
    Receives GitHub App webhook events.

    GitHub sends events here when:
    - The app is installed on an org (installation.created)
    - The app is uninstalled (installation.deleted)
    - Repos are added/removed from the installation

    The X-Orch-Org-Id header must be set in the GitHub App webhook URL:
    https://your-orch.com/api/v1/github/webhook
    with the org_id passed as a query param or custom header.
    """
    body = await request.body()

    # Verify signature
    if x_hub_signature_256:
        if not _verify_signature(body, x_hub_signature_256):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()
    event = x_github_event or ""
    action = payload.get("action", "")

    logger.info(f"GitHub webhook event={event} action={action}")

    # Resolve org_id — from header, query param, or installation lookup
    org_id = x_orch_org_id or request.query_params.get("org_id", "")

    if not org_id and event == "installation" and action == "created":
        # Try to find org by GitHub org name
        account_login = payload.get("installation", {}).get("account", {}).get("login", "")
        if account_login:
            existing = await db.githubinstallation.find_first(
                where={"githubOrgName": account_login, "active": True}
            )
            if existing:
                org_id = existing.orgId

    if event == "installation":
        if action == "created":
            if not org_id:
                logger.warning("installation.created received but no org_id — cannot link to Orch org")
                return {"status": "ignored", "reason": "no org_id"}
            await _handle_installation_created(payload, org_id)

        elif action == "deleted":
            await _handle_installation_deleted(payload)

    elif event == "installation_repositories":
        if action == "added":
            await _handle_repositories_added(payload)
        elif action == "removed":
            await _handle_repositories_removed(payload)

    return {"status": "ok"}


@router.get("/installations", summary="List GitHub installations for an org")
async def list_installations(org_id: str):
    """Returns all GitHub installations linked to an Orch org."""
    installations = await db.githubinstallation.find_many(
        where={"orgId": org_id, "active": True}
    )
    return {
        "installations": [
            {
                "id": i.id,
                "installation_id": i.installationId,
                "github_org": i.githubOrgName,
                "repos": i.repos,
                "repos_count": len(i.repos or []),
                "workflow_committed": i.workflowCommitted,
                "installed_at": i.installedAt.isoformat(),
            }
            for i in installations
        ]
    }


@router.get("/coverage", summary="PR review coverage metrics for an org")
async def get_coverage(team=Depends(get_team)):
    """
    Returns coverage metrics:
    - Total PRs reviewed (sessions with constraint_version set, from GitHub Action)
    - Repos covered by GitHub App
    - Developers active in reviews
    - Coverage % over last 30 days
    """
    import asyncio
    from datetime import datetime, timedelta

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    # Run queries in parallel
    installations, recent_sessions, all_sessions = await asyncio.gather(
        db.githubinstallation.find_many(
            where={"orgId": team.orgId, "active": True}
        ),
        db.session.find_many(
            where={
                "teamId": team.id,
                "createdAt": {"gte": thirty_days_ago},
                "constraintVersion": {"not": None}
            },
            include={"member": True}
        ),
        db.session.count(
            where={"teamId": team.id, "constraintVersion": {"not": None}}
        )
    )

    repos_covered = sum(len(i.repos or []) for i in installations)
    active_devs = len({s.memberId for s in recent_sessions if s.memberId})

    # Daily breakdown for chart (last 30 days)
    daily: dict[str, int] = {}
    for s in recent_sessions:
        day = s.createdAt.strftime("%Y-%m-%d")
        daily[day] = daily.get(day, 0) + 1

    # Fill missing days with 0
    chart = []
    for i in range(30):
        day = (datetime.utcnow() - timedelta(days=29 - i)).strftime("%Y-%m-%d")
        chart.append({"date": day, "reviews": daily.get(day, 0)})

    return {
        "repos_covered": repos_covered,
        "github_orgs_connected": len(installations),
        "reviews_last_30_days": len(recent_sessions),
        "total_reviews_all_time": all_sessions,
        "active_developers_last_30_days": active_devs,
        "daily_chart": chart,
    }


@router.delete("/installations/{installation_id}", summary="Disconnect a GitHub installation")
async def disconnect_installation(installation_id: str, org_id: str):
    """Marks a GitHub installation as inactive."""
    record = await db.githubinstallation.find_first(
        where={"id": installation_id, "orgId": org_id}
    )
    if not record:
        raise HTTPException(status_code=404, detail="Installation not found")

    await db.githubinstallation.update(
        where={"id": installation_id},
        data={"active": False}
    )
    return {"status": "disconnected"}
