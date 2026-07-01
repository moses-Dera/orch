from app.db.client import db
from app.db.repositories.message import MessageRepository
from app.logging import get_logger

logger = get_logger(__name__)


async def persist_turn(
    session_id: str,
    user_prompt: str,
    response: str,
    model_id: str,
    input_tokens: int,
    output_tokens: int
):
    """
    Persists a conversation turn to the database.
    Runs as a background task — does not block the API response.
    """
    try:
        repo = MessageRepository(db)
        await repo.create_user_message(session_id, user_prompt, model_id, input_tokens)
        await repo.create_model_message(session_id, response, model_id, output_tokens)
        logger.debug(f"Turn persisted session={session_id}")
    except Exception as e:
        logger.error(f"Persistence failed session={session_id} error={e}")
