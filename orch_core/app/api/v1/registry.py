from fastapi import APIRouter
from app.core.model_registry import KNOWN_MODELS, all_providers

router = APIRouter()


@router.get("", summary="List well-known models for dashboard auto-suggest")
async def list_registry():
    """
    Returns a list of well-known models with suggested properties.
    Used by the dashboard to auto-fill fields when an admin adds a model.
    Orgs are not restricted to this list — any model can be added.
    """
    return {
        "models": KNOWN_MODELS,
        "providers": all_providers(),
        "note": "This is a suggestion list only. You can add any model not listed here."
    }
