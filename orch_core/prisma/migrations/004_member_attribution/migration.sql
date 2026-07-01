-- Orch Migration 004 - Member Attribution
-- Created: 2026
-- Description: Links ApiKey to an optional Member so sessions can be attributed
--              to individual developers. Enables per-developer audit log and
--              cost breakdown in the dashboard.

ALTER TABLE "ApiKey"
    ADD COLUMN IF NOT EXISTS "memberId" TEXT;

ALTER TABLE "Session"
    ADD COLUMN IF NOT EXISTS "memberId" TEXT;

-- Foreign key: ApiKey -> Member (optional)
ALTER TABLE "ApiKey"
    ADD CONSTRAINT "ApiKey_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign key: Session -> Member (optional)
ALTER TABLE "Session"
    ADD CONSTRAINT "Session_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for fast per-developer session lookups
CREATE INDEX IF NOT EXISTS "Session_memberId_idx" ON "Session"("memberId");
CREATE INDEX IF NOT EXISTS "ApiKey_memberId_idx" ON "ApiKey"("memberId");
