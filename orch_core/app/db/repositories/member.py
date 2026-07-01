from datetime import datetime


class MemberRepository:
    def __init__(self, db):
        self.db = db

    async def get_by_clerk_id(self, clerk_id: str):
        return await self.db.member.find_first(
            where={"clerkId": clerk_id},
            include={"team": {"include": {"org": True}}}
        )

    async def get_by_email(self, email: str, team_id: str):
        return await self.db.member.find_first(
            where={"email": email, "teamId": team_id}
        )

    async def create(self, email: str, role: str, team_id: str, clerk_id: str | None = None, name: str | None = None):
        return await self.db.member.create(data={
            "email": email,
            "role": role,
            "teamId": team_id,
            "clerkId": clerk_id,
            "name": name,
        })

    async def update_clerk_id(self, member_id: str, clerk_id: str):
        return await self.db.member.update(
            where={"id": member_id},
            data={"clerkId": clerk_id, "lastActiveAt": datetime.utcnow()}
        )

    async def touch(self, member_id: str):
        return await self.db.member.update(
            where={"id": member_id},
            data={"lastActiveAt": datetime.utcnow()}
        )

    async def get_all_for_team(self, team_id: str):
        return await self.db.member.find_many(
            where={"teamId": team_id},
            order={"createdAt": "desc"}
        )
