from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Literal
from uuid import UUID


VALID_DOMAINS = {"auto", "backend", "cyber", "blockchain", "general"}


class PromptRequest(BaseModel):
    user_prompt: str = Field(..., min_length=1, max_length=32_000)
    domain: str = Field(default="auto")
    model: str = Field(default="auto", max_length=128)
    session_id: Optional[str] = Field(default=None, max_length=36)

    @field_validator("user_prompt")
    @classmethod
    def no_empty_prompt(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Prompt cannot be empty or whitespace.")
        return v.strip()

    @field_validator("domain")
    @classmethod
    def valid_domain(cls, v: str) -> str:
        if v.lower() not in VALID_DOMAINS:
            raise ValueError(f"Invalid domain. Must be one of: {', '.join(VALID_DOMAINS)}")
        return v.lower()

    @field_validator("session_id")
    @classmethod
    def valid_session_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        try:
            UUID(v)
        except ValueError:
            raise ValueError("session_id must be a valid UUID.")
        return v


class OrchResponse(BaseModel):
    domain_identified: str
    model_executed: str
    session_id: str
    structured_output: str
    input_tokens: int = 0
    output_tokens: int = 0
    key_source: str = "env_fallback"


class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    context_window: int = 128000


class ModelsResponse(BaseModel):
    policy: str
    models: list[ModelInfo]


class ConstraintProfile(BaseModel):
    id: str
    description: str
    version: str


class StatusResponse(BaseModel):
    org: str
    team: str
    model_policy: str
    enforced_model: Optional[str]
    constraint_profiles: list[ConstraintProfile]


class GenerateKeyResponse(BaseModel):
    key: str
    hint: str


class ReviewRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=256)
    diff: str = Field(..., min_length=1, max_length=64_000)
    domain: str = Field(default="auto")
    model: str = Field(default="auto", max_length=128)

    @field_validator("filename")
    @classmethod
    def safe_filename(cls, v: str) -> str:
        # Prevent path traversal
        if any(c in v for c in ["/", "\\", ".."]):
            raise ValueError("Filename must not contain path separators.")
        return v.strip()

    @field_validator("domain")
    @classmethod
    def valid_domain(cls, v: str) -> str:
        if v.lower() not in VALID_DOMAINS:
            raise ValueError(f"Invalid domain. Must be one of: {', '.join(VALID_DOMAINS)}")
        return v.lower()

    @field_validator("diff")
    @classmethod
    def no_empty_diff(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Diff cannot be empty.")
        return v


class ReviewIssue(BaseModel):
    severity: Literal["critical", "warning", "info"]
    line: Optional[int] = Field(default=None, ge=1)
    title: str = Field(..., max_length=256)
    detail: str = Field(..., max_length=2048)
    constraint_id: str = Field(..., max_length=64)
    suggested_fix: Optional[str] = Field(default=None, max_length=4096)


class ReviewResponse(BaseModel):
    filename: str
    domain_identified: str
    model_executed: str
    issues: list[ReviewIssue]
    summary: str
    clean: bool


class OverrideRequest(BaseModel):
    constraint_id: str = Field(..., min_length=1, max_length=64)
    session_id: str = Field(..., max_length=36)
    model_used: str = Field(..., max_length=128)
    reason: str = Field(..., min_length=1, max_length=1024)

    @field_validator("reason")
    @classmethod
    def no_empty_reason(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Reason cannot be empty.")
        return v.strip()

    @field_validator("session_id")
    @classmethod
    def valid_session_id(cls, v: str) -> str:
        if v == "agent":
            return v
        try:
            UUID(v)
        except ValueError:
            raise ValueError("session_id must be a valid UUID.")
        return v
