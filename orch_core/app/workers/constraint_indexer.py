import uuid
import asyncio
from app.db.client import db
from app.services.embeddings import embed_batch
from app.logging import get_logger

logger = get_logger(__name__)

_CHUNK_SIZE = 400    # tokens approx — ~1600 chars
_CHUNK_OVERLAP = 50  # chars overlap between chunks


def _chunk_text(text: str, chunk_size: int = _CHUNK_SIZE * 4, overlap: int = _CHUNK_OVERLAP * 4) -> list[str]:
    """
    Split text into overlapping chunks by character count.
    Tries to split on sentence boundaries where possible.
    """
    if len(text) <= chunk_size:
        return [text.strip()]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size

        if end < len(text):
            # Try to find a sentence boundary near the end
            for sep in ["\n\n", "\n", ". ", "! ", "? "]:
                boundary = text.rfind(sep, start + chunk_size // 2, end)
                if boundary != -1:
                    end = boundary + len(sep)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = end - overlap

    return chunks


async def index_constraint(constraint_id: str, api_key: str | None = None) -> int:
    """
    Chunks and embeds a constraint profile, storing results in pgvector.
    Returns the number of chunks indexed.
    Called when a constraint is created or updated.
    """
    record = await db.domainconstraint.find_unique(where={"id": constraint_id})
    if not record:
        logger.warning(f"Constraint not found for indexing: {constraint_id}")
        return 0

    # Combine all variants into one indexable corpus
    texts_to_index = [record.constraints]
    if record.gptVariant:
        texts_to_index.append(record.gptVariant)
    if record.claudeVariant:
        texts_to_index.append(record.claudeVariant)
    if record.geminiVariant:
        texts_to_index.append(record.geminiVariant)

    full_text = "\n\n".join(texts_to_index)
    chunks = _chunk_text(full_text)

    if not chunks:
        return 0

    logger.info(f"Indexing constraint={constraint_id} chunks={len(chunks)}")

    # Embed all chunks in one batch call
    embeddings = await embed_batch(chunks, api_key=api_key)

    # Delete existing chunks for this constraint
    await db.constraintchunk.delete_many(where={"constraintId": constraint_id})

    # Insert new chunks with embeddings via raw SQL (pgvector)
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_id = str(uuid.uuid4())
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

        await db.execute_raw(
            """
            INSERT INTO "ConstraintChunk" ("id", "constraintId", "chunkIndex", "content", "embedding", "createdAt")
            VALUES ($1, $2, $3, $4, $5::vector, NOW())
            """,
            chunk_id, constraint_id, i, chunk, embedding_str
        )

    logger.info(f"Indexed constraint={constraint_id} chunks={len(chunks)}")
    return len(chunks)


async def index_all_constraints(api_key: str | None = None) -> dict:
    """
    Re-indexes all constraint profiles.
    Called on startup or when the embedding model changes.
    """
    constraints = await db.domainconstraint.find_many()
    results = {}

    for c in constraints:
        try:
            count = await index_constraint(c.id, api_key=api_key)
            results[c.id] = count
        except Exception as e:
            logger.error(f"Failed to index constraint={c.id}: {e}")
            results[c.id] = 0

    return results
