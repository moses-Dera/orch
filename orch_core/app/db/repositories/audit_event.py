class AuditEventRepository:
    def __init__(self, db):
        self.db = db

    async def log(
        self,
        org_id: str,
        action: str,
        member_id: str | None = None,
        clerk_id: str | None = None,
        resource: str | None = None,
        metadata: dict | None = None,
        ip: str | None = None,
    ):
        return await self.db.auditevent.create(data={
            "orgId": org_id,
            "action": action,
            "memberId": member_id,
            "clerkId": clerk_id,
            "resource": resource,
            "metadata": metadata,
            "ip": ip,
        })

    async def get_for_org(self, org_id: str, limit: int = 100):
        return await self.db.auditevent.find_many(
            where={"orgId": org_id},
            order={"createdAt": "desc"},
            take=limit
        )
