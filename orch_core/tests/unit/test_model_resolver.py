import pytest
from unittest.mock import AsyncMock, MagicMock
from app.core.model_resolver import resolve_model
from app.models.errors import ModelNotAllowedError


def make_team(policy: str, enforced_model: str = None):
    org = MagicMock()
    org.id = "org-1"
    org.modelPolicy = policy
    org.enforcedModel = enforced_model
    team = MagicMock()
    team.org = org
    return team


def make_repo(model_ids: list[str] = None):
    repo = MagicMock()
    configs = [MagicMock(modelId=m, contextWindow=128000, displayName=m, endpoint=None, encryptedKey=None)
               for m in (model_ids or [])]
    repo.get_active_for_org = AsyncMock(return_value=configs)
    repo.get_by_model_id = AsyncMock(return_value=None)
    return repo


# --- Scenario 1: Developer personal key ---

@pytest.mark.asyncio
async def test_developer_personal_key_used_on_open_policy():
    team = make_team("open")
    repo = make_repo()
    result = await resolve_model("openai/gpt-4.1", team, repo, developer_model_key="sk-personal-key")
    assert result["api_key"] == "sk-personal-key"
    assert result["key_source"] == "developer_personal"
    assert result["model_id"] == "openai/gpt-4.1"


@pytest.mark.asyncio
async def test_developer_personal_key_used_on_allowlist_policy():
    team = make_team("allowlist")
    repo = make_repo(["openai/gpt-4.1"])
    result = await resolve_model("openai/gpt-4.1", team, repo, developer_model_key="sk-personal-key")
    assert result["api_key"] == "sk-personal-key"
    assert result["key_source"] == "developer_personal"


@pytest.mark.asyncio
async def test_developer_personal_key_ignored_on_enforced_policy():
    """Enforced policy overrides everything including personal keys."""
    team = make_team("enforced", enforced_model="azure/gpt-4o")
    repo = make_repo()
    result = await resolve_model("openai/gpt-4.1", team, repo, developer_model_key="sk-personal-key")
    assert result["model_id"] == "azure/gpt-4o"
    assert result["key_source"] != "developer_personal"


# --- Scenario 2: Team shared key ---

@pytest.mark.asyncio
async def test_team_shared_key_used_when_no_personal_key():
    team = make_team("open")
    repo = make_repo()
    team_config = MagicMock()
    team_config.modelId = "openai/gpt-4.1"
    team_config.displayName = "Team GPT-4.1"
    team_config.endpoint = None
    team_config.encryptedKey = "local:dGVhbS1rZXk="  # base64 "team-key"
    team_config.contextWindow = 1_047_576
    repo.get_by_model_id = AsyncMock(return_value=team_config)

    result = await resolve_model("openai/gpt-4.1", team, repo, developer_model_key=None)
    assert result["key_source"] == "team_config"
    assert result["display_name"] == "Team GPT-4.1"
    assert result["context_window"] == 1_047_576


@pytest.mark.asyncio
async def test_team_key_takes_precedence_over_env_fallback():
    team = make_team("open")
    repo = make_repo()
    team_config = MagicMock()
    team_config.modelId = "openai/gpt-4.1"
    team_config.displayName = "Team GPT-4.1"
    team_config.endpoint = None
    team_config.encryptedKey = "local:dGVhbS1rZXk="
    team_config.contextWindow = 128000
    repo.get_by_model_id = AsyncMock(return_value=team_config)

    result = await resolve_model("openai/gpt-4.1", team, repo)
    assert result["key_source"] == "team_config"


# --- Enforced policy ---

@pytest.mark.asyncio
async def test_enforced_policy_overrides_model_and_key():
    team = make_team("enforced", enforced_model="azure/gpt-4o")
    repo = make_repo()
    result = await resolve_model("anthropic/claude-sonnet-4", team, repo, developer_model_key="sk-dev")
    assert result["model_id"] == "azure/gpt-4o"
    assert result["api_key"] != "sk-dev"


# --- Allowlist policy ---

@pytest.mark.asyncio
async def test_allowlist_rejects_unapproved_model():
    team = make_team("allowlist")
    repo = make_repo(["openai/gpt-4.1"])
    with pytest.raises(ModelNotAllowedError) as exc:
        await resolve_model("anthropic/claude-sonnet-4", team, repo)
    assert exc.value.requested == "anthropic/claude-sonnet-4"
    assert "openai/gpt-4.1" in exc.value.allowed


@pytest.mark.asyncio
async def test_auto_model_picks_first_from_allowlist():
    team = make_team("allowlist")
    repo = make_repo(["openai/gpt-4.1", "anthropic/claude-sonnet-4"])
    result = await resolve_model("auto", team, repo)
    assert result["model_id"] == "openai/gpt-4.1"
