-- Orch Migration 001 - Initial Schema
-- Created: 2026
-- Description: Full initial schema including Organization, Team, Member, ApiKey,
--              ModelConfig (with contextWindow), Session, Message, DomainConstraint

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "Organization" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name"          TEXT NOT NULL,
    "modelPolicy"   TEXT NOT NULL DEFAULT 'open',
    "enforcedModel" TEXT,
    "tier"          TEXT NOT NULL DEFAULT 'free',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
    "id"     TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name"   TEXT NOT NULL,
    "orgId"  TEXT NOT NULL,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Member" (
    "id"     TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email"  TEXT NOT NULL,
    "role"   TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "key"       TEXT NOT NULL,
    "label"     TEXT NOT NULL DEFAULT 'default',
    "teamId"    TEXT NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

CREATE TABLE "ModelConfig" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "orgId"         TEXT NOT NULL,
    "displayName"   TEXT NOT NULL,
    "provider"      TEXT NOT NULL,
    "modelId"       TEXT NOT NULL,
    "endpoint"      TEXT,
    "encryptedKey"  TEXT,
    "contextWindow" INTEGER NOT NULL DEFAULT 128000,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "addedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "constraintVersion" TEXT,
    "teamId"            TEXT,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id"           SERIAL NOT NULL,
    "role"         TEXT NOT NULL,
    "content"      TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId"    TEXT NOT NULL,
    "modelUsed"    TEXT,
    "inputTokens"  INTEGER,
    "outputTokens" INTEGER,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DomainConstraint" (
    "id"            TEXT NOT NULL,
    "description"   TEXT NOT NULL,
    "constraints"   TEXT NOT NULL,
    "gptVariant"    TEXT,
    "claudeVariant" TEXT,
    "geminiVariant" TEXT,
    "version"       TEXT NOT NULL DEFAULT '1.0',
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DomainConstraint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DomainConstraint_id_key" ON "DomainConstraint"("id");

-- Foreign keys
ALTER TABLE "Team"
    ADD CONSTRAINT "Team_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Member"
    ADD CONSTRAINT "Member_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ApiKey"
    ADD CONSTRAINT "ApiKey_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ModelConfig"
    ADD CONSTRAINT "ModelConfig_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Session"
    ADD CONSTRAINT "Session_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
