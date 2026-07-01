from app.services.cache import get_constraint, set_constraint
from app.db.repositories.constraint import ConstraintRepository
from app.core.rag_retriever import retrieve_relevant_constraints
from app.logging import get_logger

logger = get_logger(__name__)

_FALLBACK = "You are a Senior Software Engineer. Provide robust, clean, and maintainable solutions."


async def load_constraint(
    domain: str,
    model_id: str,
    repo: ConstraintRepository,
    prompt: str | None = None,
    api_key: str | None = None,
) -> tuple[str, str]:
    """
    Loads the constraint for a domain.

    If a prompt is provided and RAG chunks exist for this domain,
    retrieves the most relevant chunks via semantic search.
    Otherwise falls back to the full constraint profile.

    Returns (system_instruction, version).
    """
    # Try RAG retrieval when a prompt is available
    if prompt:
        rag_result = await retrieve_relevant_constraints(
            prompt=prompt,
            domain=domain,
            api_key=api_key,
        )
        if rag_result:
            # Get version from cache or DB for attribution
            version = await _get_version(domain, repo)
            logger.debug(f"RAG constraint loaded domain={domain}")
            return rag_result, version

    # Fall back to full constraint (cached or DB)
    cached = await get_constraint(domain)
    if cached:
        logger.debug(f"Constraint cache hit: {domain}")
        return _pick_variant(cached, model_id), cached.get("version", "1.0")

    record = await repo.get(domain)
    if record:
        data = {
            "constraints": record.constraints,
            "gptVariant": record.gptVariant,
            "claudeVariant": record.claudeVariant,
            "geminiVariant": record.geminiVariant,
            "version": record.version
        }
        await set_constraint(domain, data)
        logger.debug(f"Constraint loaded from DB: {domain} v{record.version}")
        return _pick_variant(data, model_id), record.version

    logger.warning(f"No constraint found for domain '{domain}', using fallback.")
    return _FALLBACK, "1.0"


async def _get_version(domain: str, repo: ConstraintRepository) -> str:
    cached = await get_constraint(domain)
    if cached:
        return cached.get("version", "1.0")
    record = await repo.get(domain)
    return record.version if record else "1.0"


def _pick_variant(data: dict, model_id: str) -> str:
    model_lower = model_id.lower()
    if "gpt" in model_lower and data.get("gptVariant"):
        return data["gptVariant"]
    if "claude" in model_lower and data.get("claudeVariant"):
        return data["claudeVariant"]
    if "gemini" in model_lower and data.get("geminiVariant"):
        return data["geminiVariant"]
    return data["constraints"]
