from prisma import Prisma


class MessageRepository:
    def __init__(self, db: Prisma):
        self.db = db

    async def create_user_message(
        self,
        session_id: str,
        content: str,
        model_id: str,
        input_tokens: int
    ):
        return await self.db.message.create(data={
            "role": "user",
            "content": content,
            "sessionId": session_id,
            "modelUsed": model_id,
            "inputTokens": input_tokens,
            "outputTokens": 0
        })

    async def create_model_message(
        self,
        session_id: str,
        content: str,
        model_id: str,
        output_tokens: int
    ):
        return await self.db.message.create(data={
            "role": "model",
            "content": content,
            "sessionId": session_id,
            "modelUsed": model_id,
            "inputTokens": 0,
            "outputTokens": output_tokens
        })
