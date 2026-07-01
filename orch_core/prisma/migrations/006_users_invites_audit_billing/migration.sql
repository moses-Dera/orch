-- Orch Migration 006 - Users, Invites, OrgMembership, AuditEvent, Billing, ModelRelease
-- Created: 2026
-- Description: Adds clerkId to Member, Invite system, OrgMembership for multi-org
--              support, AuditEvent log, Billing table, ModelRelease tracker

-- 1. Add missing columns to Member
ALTER TABLE "Member"
    ADD COLUMN IF NOT EXISTS "clerkId"      TEXT,
    ADD COLUMN IF NOT EXISTS "name"         TEXT,
    ADD COLUMN IF NOT EXISTS "avatarUrl"    TEXT,
    ADD COLUMN IF NOT EXISTS "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Member_clerkId_key"
    ON "Member"("clerkId") WHERE "clerkId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Member_email_teamId_key"
    ON "Member"("email", "teamId");

-- 2. Add memberId to ApiKey (column may already exist from migration 004)
ALTER TABLE "ApiKey"
    ADD COLUMN IF NOT EXISTS "memberId" TEXT;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ApiKey_memberId_fkey'
    ) THEN
        ALTER TABLE "ApiKey"
            ADD CONSTRAINT "ApiKey_memberId_fkey"
            FOREIGN KEY ("memberId") REFERENCES "Member"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Add memberId to Session (column may already exist from migration 004)
ALTER TABLE "Session"
    ADD COLUMN IF NOT EXISTS "memberId" TEXT;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Session_memberId_fkey'
    ) THEN
        ALTER TABLE "Session"
            ADD CONSTRAINT "Session_memberId_fkey"
            FOREIGN KEY ("memberId") REFERENCES "Member"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Invite table
CREATE TABLE IF NOT EXISTS "Invite" (
    "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "email"     TEXT        NOT NULL,
    "role"      TEXT        NOT NULL DEFAULT 'member',
    "teamId"    TEXT        NOT NULL,
    "orgId"     TEXT        NOT NULL,
    "token"     TEXT        NOT NULL,
    "accepted"  BOOLEAN     NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invite_token_key" ON "Invite"("token");
CREATE INDEX IF NOT EXISTS "Invite_email_idx" ON "Invite"("email");

ALTER TABLE "Invite"
    ADD CONSTRAINT "Invite_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invite"
    ADD CONSTRAINT "Invite_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. OrgMembership — one user can belong to multiple orgs
CREATE TABLE IF NOT EXISTS "OrgMembership" (
    "id"       TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "clerkId"  TEXT        NOT NULL,
    "orgId"    TEXT        NOT NULL,
    "role"     TEXT        NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgMembership_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrgMembership_clerkId_orgId_key" UNIQUE ("clerkId", "orgId")
);

CREATE INDEX IF NOT EXISTS "OrgMembership_clerkId_idx" ON "OrgMembership"("clerkId");

ALTER TABLE "OrgMembership"
    ADD CONSTRAINT "OrgMembership_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. AuditEvent — structured event log
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "orgId"     TEXT        NOT NULL,
    "memberId"  TEXT,
    "clerkId"   TEXT,
    "action"    TEXT        NOT NULL,
    "resource"  TEXT,
    "metadata"  JSONB,
    "ip"        TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditEvent_orgId_idx"     ON "AuditEvent"("orgId");
CREATE INDEX IF NOT EXISTS "AuditEvent_memberId_idx"  ON "AuditEvent"("memberId");
CREATE INDEX IF NOT EXISTS "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt" DESC);

ALTER TABLE "AuditEvent"
    ADD CONSTRAINT "AuditEvent_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Billing — subscription tracking per org
CREATE TABLE IF NOT EXISTS "Billing" (
    "id"                   TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "orgId"                TEXT        NOT NULL,
    "stripeCustomerId"     TEXT,
    "stripeSubscriptionId" TEXT,
    "plan"                 TEXT        NOT NULL DEFAULT 'free',
    "status"               TEXT        NOT NULL DEFAULT 'active',
    "currentPeriodStart"   TIMESTAMP(3),
    "currentPeriodEnd"     TIMESTAMP(3),
    "cancelAtPeriodEnd"    BOOLEAN     NOT NULL DEFAULT false,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Billing_orgId_key" UNIQUE ("orgId")
);

ALTER TABLE "Billing"
    ADD CONSTRAINT "Billing_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. ModelRelease — tracks new model releases for notifications
CREATE TABLE IF NOT EXISTS "ModelRelease" (
    "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "modelId"       TEXT        NOT NULL,
    "provider"      TEXT        NOT NULL,
    "displayName"   TEXT        NOT NULL,
    "contextWindow" INTEGER,
    "detectedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedOrgs"  TEXT[]      NOT NULL DEFAULT '{}',
    CONSTRAINT "ModelRelease_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ModelRelease_modelId_key" UNIQUE ("modelId")
);

-- 9. Add ownerClerkId and slug to Organization
ALTER TABLE "Organization"
    ADD COLUMN IF NOT EXISTS "ownerClerkId" TEXT,
    ADD COLUMN IF NOT EXISTS "slug"         TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key"
    ON "Organization"("slug") WHERE "slug" IS NOT NULL;
