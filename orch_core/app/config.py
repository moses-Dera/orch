from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    env: str = "development"
    app_version: str = "1.0.0"

    # Database
    database_url: str

    # Redis (optional)
    redis_url: str = "redis://localhost:6379"

    # LLM
    gemini_api_key: str = ""
    default_model: str = "gemini/gemini-1.5-pro"
    router_model: str = "gemini/gemini-1.5-flash"

    # AWS KMS (optional)
    kms_key_id: str = ""
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # Context window management
    context_window_default: int = 128000   # default token limit
    context_budget_system: int = 2000      # reserved for system instruction
    context_budget_prompt: int = 4000      # reserved for current user prompt
    context_budget_output: int = 4000      # reserved for model output

    # Rate limiting (requests per minute per tier)
    rate_limit_free: int = 10
    rate_limit_pro: int = 60
    rate_limit_business: int = 200
    rate_limit_enterprise: int = 1000

    # CLI
    orch_api_url: str = "http://127.0.0.1:8000"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # GitHub App
    github_app_id: str = ""
    github_app_private_key: str = ""  # base64-encoded PEM
    github_webhook_secret: str = ""

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
