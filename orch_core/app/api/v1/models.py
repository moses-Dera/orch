from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.models.schemas import ModelsResponse, ModelInfo
from app.db.client import db
from app.api.deps import get_team
from app.services.encryption import encrypt_key
from app.services.cache import invalidate_constraint
from app.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


class AddModelRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=128)
    provider: str = Field(..., min_length=1, max_length=64)
    model_id: str = Field(..., min_length=1, max_length=128)
    endpoint: Optional[str] = Field(default=None, max_length=512)
    api_key: Optional[str] = Field(default=None, max_length=512)
    context_window: int = Field(default=128000, ge=1024)


@router.get("", response_model=ModelsResponse, summary="List approved models for your org")
async def list_models(team=Depends(get_team)):
    configs = await db.modelconfig.find_many(
        where={"orgId": team.orgId, "isActive": True}
    )
    return ModelsResponse(
        policy=team.org.modelPolicy,
        models=[
            ModelInfo(
                id=c.modelId,
                name=c.displayName,
                provider=c.provider,
                context_window=c.contextWindow
            )
            for c in configs
        ]
    )


@router.post("", summary="Add a model to the org's approved list")
async def add_model(request: AddModelRequest, team=Depends(get_team)):
    encrypted = encrypt_key(request.api_key) if request.api_key else None
    config = await db.modelconfig.create(data={
        "orgId": team.orgId,
        "displayName": request.display_name,
        "provider": request.provider,
        "modelId": request.model_id,
        "endpoint": request.endpoint,
        "encryptedKey": encrypted,
        "contextWindow": request.context_window,
        "isActive": True,
    })
    logger.info(f"Model added org={team.orgId} model={request.model_id}")
    return {"id": config.id, "model_id": config.modelId, "display_name": config.displayName}


@router.delete("/{config_id}", summary="Deactivate a model from the org's approved list")
async def remove_model(config_id: str, team=Depends(get_team)):
    config = await db.modelconfig.find_first(
        where={"id": config_id, "orgId": team.orgId}
    )
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found.")
    await db.modelconfig.update(
        where={"id": config_id},
        data={"isActive": False}
    )
    logger.info(f"Model deactivated org={team.orgId} config={config_id}")
    return {"status": "deactivated"}
