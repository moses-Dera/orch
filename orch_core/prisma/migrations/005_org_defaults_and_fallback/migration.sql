-- Orch Migration 005 - Org Default Model and Fallback Chain
-- Created: 2026
-- Description: Adds defaultModelId so orgs can set a preferred model for 'auto'
--              requests. Adds fallbackModelIds as an ordered list of model IDs
--              to try if the primary model fails.

ALTER TABLE "Organization"
    ADD COLUMN IF NOT EXISTS "defaultModelId" TEXT;

ALTER TABLE "Organization"
    ADD COLUMN IF NOT EXISTS "fallbackModelIds" TEXT[] NOT NULL DEFAULT '{}';
