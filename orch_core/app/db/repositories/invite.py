import secrets
from datetime import datetime, timedelta


class InviteRepository:
    def __init__(self, db):
        self.db = db

    async def create(self, email: str, role: str, team_id: str, org_id: str, invited_by: str | None = None):
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7)
        return await self.db.invite.create(data={
            "email": email,
            "role": role,
            "teamId": team_id,
            "orgId": org_id,
            "token": token,
            "expiresAt": expires_at,
            "invitedBy": invited_by,
        })

    async def get_by_token(self, token: str):
        return await self.db.invite.find_unique(
            where={"token": token},
            include={"team": {"include": {"org": True}}}
        )

    async def accept(self, token: str):
        return await self.db.invite.update(
            where={"token": token},
            data={"accepted": True}
        )

    async def get_pending_for_org(self, org_id: str):
        return await self.db.invite.find_many(
            where={"orgId": org_id, "accepted": False},
            order={"createdAt": "desc"}
        )
