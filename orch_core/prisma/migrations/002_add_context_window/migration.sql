-- Orch Migration 002 - Add contextWindow to ModelConfig, tier to Organization
-- Created: 2026
-- Description: Stores context window size per model config so the context manager
--              reads from DB instead of relying on hardcoded model name lookups.
--              Also adds tier field to Organization for rate limiting.

ALTER TABLE "ModelConfig"
    ADD COLUMN IF NOT EXISTS "contextWindow" INTEGER NOT NULL DEFAULT 128000;

ALTER TABLE "Organization"
    ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free';
