from prisma import Prisma
from prisma.models import Session


class SessionRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def create(self, team_id: str | None, constraint_version: str, member_id: str | None = None) -> Session:
        return await self.db.session.create(data={
            "teamId": team_id,
            "constraintVersion": constraint_version,
            "memberId": member_id
        })

    async def create_with_id(self, session_id: str, team_id: str | None, member_id: str | None = None) -> Session:
        return await self.db.session.create(data={
            "id": session_id,
            "teamId": team_id,
            "memberId": member_id
        })

    async def get_with_messages(self, session_id: str) -> Session | None:
        return await self.db.session.find_unique(
            where={"id": session_id},
            include={"messages": {"order_by": {"createdAt": "asc"}}}
        )

    async def get_by_member(self, member_id: str, limit: int = 50) -> list[Session]:
        return await self.db.session.find_many(
            where={"memberId": member_id},
            order={"createdAt": "desc"},
            take=limit
        )

    async def get_by_org(self, org_id: str, limit: int = 100) -> list[Session]:
        return await self.db.session.find_many(
            where={"team": {"is": {"orgId": org_id}}},
            include={"member": True},
            order={"createdAt": "desc"},
            take=limit
        )
