from prisma import Prisma


class ConstraintOverrideRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def create(self, constraint_id: str, session_id: str, model_used: str, reason: str):
        return await self.db.constraintoverride.create(data={
            "constraintId": constraint_id,
            "sessionId": session_id,
            "modelUsed": model_used,
            "reason": reason
        })

    async def count_for_constraint(self, constraint_id: str, org_id: str, days: int = 30) -> int:
        from datetime import datetime, timedelta
        since = datetime.utcnow() - timedelta(days=days)
        return await self.db.constraintoverride.count(
            where={
                "constraintId": constraint_id,
                "createdAt": {"gte": since}
            }
        )

    async def get_recent(self, constraint_id: str, limit: int = 10):
        return await self.db.constraintoverride.find_many(
            where={"constraintId": constraint_id},
            order={"createdAt": "desc"},
            take=limit
        )


class ConstraintHealthRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def get(self, constraint_id: str, org_id: str):
        return await self.db.constrainthealth.find_unique(
            where={"constraintId_orgId": {"constraintId": constraint_id, "orgId": org_id}}
        )

    async def get_all_for_org(self, org_id: str):
        return await self.db.constrainthealth.find_many(
            where={"orgId": org_id},
            order={"healthScore": "asc"}  # worst scores first
        )

    async def upsert(self, constraint_id: str, org_id: str, data: dict):
        from datetime import datetime
        return await self.db.constrainthealth.upsert(
            where={"constraintId_orgId": {"constraintId": constraint_id, "orgId": org_id}},
            data={
                "create": {
                    "constraintId": constraint_id,
                    "orgId": org_id,
                    **data,
                    "lastComputed": datetime.utcnow()
                },
                "update": {
                    **data,
                    "lastComputed": datetime.utcnow()
                }
            }
        )
