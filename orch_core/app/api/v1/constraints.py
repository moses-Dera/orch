import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.api.deps import get_team
from app.db.repositories.constraint import ConstraintRepository
from app.db.client import db
from app.services.cache import invalidate_constraint
from app.workers.constraint_indexer import index_constraint
from app.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


class UpsertConstraintRequest(BaseModel):
    id: str = Field(..., min_length=1, max_length=64,
                    description="Domain ID: backend, cyber, blockchain, general, or custom")
    description: str = Field(..., min_length=1, max_length=256)
    constraints: str = Field(..., min_length=1, max_length=8000)
    gpt_variant: Optional[str] = Field(default=None, max_length=8000)
    claude_variant: Optional[str] = Field(default=None, max_length=8000)
    gemini_variant: Optional[str] = Field(default=None, max_length=8000)
    version: str = Field(default="1.0", max_length=16)


@router.get("", summary="List all constraint profiles")
async def list_constraints(team=Depends(get_team)):
    repo = ConstraintRepository(db)
    constraints = await repo.get_all()
    return {
        "constraints": [
            {
                "id": c.id,
                "description": c.description,
                "constraints": c.constraints,
                "gpt_variant": c.gptVariant,
                "claude_variant": c.claudeVariant,
                "gemini_variant": c.geminiVariant,
                "version": c.version,
                "updated_at": c.updatedAt.isoformat(),
            }
            for c in constraints
        ]
    }


@router.put("/{constraint_id}", summary="Create or update a constraint profile")
async def upsert_constraint(
    constraint_id: str,
    request: UpsertConstraintRequest,
    team=Depends(get_team)
):
    if constraint_id != request.id:
        raise HTTPException(status_code=400, detail="URL constraint_id must match body id.")

    repo = ConstraintRepository(db)
    constraint = await repo.upsert({
        "id": request.id,
        "description": request.description,
        "constraints": request.constraints,
        "gptVariant": request.gpt_variant,
        "claudeVariant": request.claude_variant,
        "geminiVariant": request.gemini_variant,
        "version": request.version,
    })

    # Invalidate cache so next request picks up the new version
    await invalidate_constraint(request.id)

    # Re-index for RAG in background — non-blocking
    api_key = getattr(getattr(team, 'org', None), 'defaultApiKey', None)
    asyncio.create_task(index_constraint(request.id, api_key=api_key))

    logger.info(f"Constraint upserted id={request.id} version={request.version}")
    return {
        "id": constraint.id,
        "version": constraint.version,
        "updated_at": constraint.updatedAt.isoformat(),
    }


@router.delete("/{constraint_id}", summary="Delete a constraint profile")
async def delete_constraint(constraint_id: str, team=Depends(get_team)):
    existing = await db.domainconstraint.find_unique(where={"id": constraint_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Constraint not found.")

    # Prevent deleting built-in constraints
    if constraint_id in {"backend", "cyber", "blockchain", "general"}:
        raise HTTPException(
            status_code=403,
            detail="Built-in constraints cannot be deleted. Edit them instead."
        )

    await db.domainconstraint.delete(where={"id": constraint_id})
    await invalidate_constraint(constraint_id)
    logger.info(f"Constraint deleted id={constraint_id}")
    return {"status": "deleted"}


@router.post("/{constraint_id}/index", summary="Re-index a constraint for RAG")
async def reindex_constraint(constraint_id: str, team=Depends(get_team)):
    """
    Manually triggers RAG re-indexing for a constraint.
    Useful after bulk imports or when the embedding model changes.
    """
    existing = await db.domainconstraint.find_unique(where={"id": constraint_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Constraint not found.")

    count = await index_constraint(constraint_id)
    return {"constraint_id": constraint_id, "chunks_indexed": count}


@router.post("/index-all", summary="Re-index all constraints for RAG")
async def reindex_all(team=Depends(get_team)):
    """Re-indexes all constraint profiles. Admin only."""
    from app.workers.constraint_indexer import index_all_constraints
    results = await index_all_constraints()
    total = sum(results.values())
    return {"constraints_indexed": len(results), "total_chunks": total, "breakdown": results}
