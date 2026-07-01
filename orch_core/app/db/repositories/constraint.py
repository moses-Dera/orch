from prisma import Prisma
from prisma.models import DomainConstraint


class ConstraintRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def get(self, domain_id: str) -> DomainConstraint | None:
        return await self.db.domainconstraint.find_unique(where={"id": domain_id})

    async def get_all(self) -> list[DomainConstraint]:
        return await self.db.domainconstraint.find_many()

    async def upsert(self, data: dict) -> DomainConstraint:
        return await self.db.domainconstraint.upsert(
            where={"id": data["id"]},
            data={"create": data, "update": data}
        )
