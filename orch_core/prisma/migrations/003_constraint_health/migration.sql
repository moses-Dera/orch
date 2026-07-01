-- Orch Migration 003 - Constraint Health Scoring
-- Created: 2026
-- Description: Adds ConstraintOverride and ConstraintHealth tables for
--              tracking developer override rates and computing health scores
--              per constraint per org.

CREATE TABLE "ConstraintOverride" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "constraintId" TEXT NOT NULL,
    "sessionId"    TEXT NOT NULL,
    "modelUsed"    TEXT NOT NULL,
    "reason"       TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConstraintOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstraintHealth" (
    "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "constraintId"   TEXT NOT NULL,
    "orgId"          TEXT NOT NULL,
    "totalRequests"  INTEGER NOT NULL DEFAULT 0,
    "totalOverrides" INTEGER NOT NULL DEFAULT 0,
    "overrideRate"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "healthScore"    DOUBLE PRECISION NOT NULL DEFAULT 100,
    "lastComputed"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConstraintHealth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConstraintHealth_constraintId_orgId_key"
    ON "ConstraintHealth"("constraintId", "orgId");

ALTER TABLE "ConstraintOverride"
    ADD CONSTRAINT "ConstraintOverride_constraintId_fkey"
    FOREIGN KEY ("constraintId") REFERENCES "DomainConstraint"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConstraintHealth"
    ADD CONSTRAINT "ConstraintHealth_constraintId_fkey"
    FOREIGN KEY ("constraintId") REFERENCES "DomainConstraint"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
