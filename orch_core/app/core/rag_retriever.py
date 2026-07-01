from app.db.client import db
from app.services.embeddings import embed
from app.logging import get_logger

logger = get_logger(__name__)

_TOP_K = 5           # number of chunks to retrieve
_MIN_SIMILARITY = 0.3  # minimum cosine similarity threshold


async def retrieve_relevant_constraints(
    prompt: str,
    domain: str,
    api_key: str | None = None,
    top_k: int = _TOP_K,
) -> str | None:
    """
    Embeds the prompt and retrieves the most relevant constraint chunks
    for the given domain using pgvector cosine similarity.

    Returns assembled constraint text, or None if no chunks exist
    (falls back to full constraint loading).
    """
    try:
        # Check if any chunks exist for this domain
        chunk_count = await db.constraintchunk.count(
            where={"constraintId": domain}
        )
        if chunk_count == 0:
            logger.debug(f"No RAG chunks for domain={domain}, using full constraint")
            return None

        # Embed the prompt
        query_embedding = await embed(prompt, api_key=api_key)
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        # Retrieve top-k chunks via cosine similarity
        results = await db.query_raw(
            """
            SELECT
                "id",
                "content",
                "chunkIndex",
                1 - ("embedding" <=> $1::vector) AS similarity
            FROM "ConstraintChunk"
            WHERE "constraintId" = $2
              AND 1 - ("embedding" <=> $1::vector) >= $3
            ORDER BY "embedding" <=> $1::vector
            LIMIT $4
            """,
            embedding_str, domain, _MIN_SIMILARITY, top_k
        )

        if not results:
            logger.debug(f"No relevant chunks found for domain={domain}, using full constraint")
            return None

        # Sort by chunk index to preserve logical order
        results.sort(key=lambda r: r["chunkIndex"])

        assembled = "\n\n".join(r["content"] for r in results)
        logger.debug(f"RAG retrieved {len(results)} chunks for domain={domain} similarity_range=[{results[0].get('similarity', 0):.2f}-{results[-1].get('similarity', 0):.2f}]")

        return assembled

    except Exception as e:
        logger.warning(f"RAG retrieval failed for domain={domain}: {e} — falling back to full constraint")
        return None
