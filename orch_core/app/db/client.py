from prisma import Prisma
from app.config import get_settings

settings = get_settings()

db = Prisma(datasource={"url": settings.database_url})


async def connect():
    if not db.is_connected():
        await db.connect()


async def disconnect():
    if db.is_connected():
        await db.disconnect()
