from fastapi import APIRouter
from app.api.v1 import orchestrate, models, status, keys, registry, health, audit, review, members, onboarding, constraints, github

router = APIRouter(prefix="/api/v1")

router.include_router(orchestrate.router,  prefix="/orchestrate",  tags=["Orchestrate"])
router.include_router(models.router,       prefix="/models",       tags=["Models"])
router.include_router(constraints.router,  prefix="/constraints",  tags=["Constraints"])
router.include_router(status.router,       prefix="/status",       tags=["Status"])
router.include_router(keys.router,         prefix="/keys",         tags=["Keys"])
router.include_router(registry.router,     prefix="/registry",     tags=["Registry"])
router.include_router(health.router,       prefix="/health",       tags=["Health"])
router.include_router(audit.router,        prefix="/audit",        tags=["Audit"])
router.include_router(review.router,       prefix="/review",       tags=["Review"])
router.include_router(members.router,      prefix="/members",      tags=["Members"])
router.include_router(onboarding.router,   prefix="/onboarding",   tags=["Onboarding"])
router.include_router(github.router,       prefix="/github",       tags=["GitHub"])
