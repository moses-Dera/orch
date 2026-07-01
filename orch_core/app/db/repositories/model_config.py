from prisma import Prisma
from prisma.models import ModelConfig


class ModelConfigRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def get_active_for_org(self, org_id: str) -> list[ModelConfig]:
        return await self.db.modelconfig.find_many(
            where={"orgId": org_id, "isActive": True}
        )

    async def get_by_model_id(self, org_id: str, model_id: str) -> ModelConfig | None:
        return await self.db.modelconfig.find_first(
            where={"orgId": org_id, "modelId": model_id, "isActive": True}
        )

    async def get_context_window(self, org_id: str, model_id: str) -> int | None:
        config = await self.get_by_model_id(org_id, model_id)
        return config.contextWindow if config else None

    async def create(self, data: dict) -> ModelConfig:
        return await self.db.modelconfig.create(data=data)

    async def deactivate(self, config_id: str) -> ModelConfig:
        return await self.db.modelconfig.update(
            where={"id": config_id},
            data={"isActive": False}
        )
