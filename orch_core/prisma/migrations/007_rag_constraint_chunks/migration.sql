-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create ConstraintChunk table
CREATE TABLE IF NOT EXISTS "ConstraintChunk" (
    "id"           TEXT NOT NULL,
    "constraintId" TEXT NOT NULL,
    "chunkIndex"   INTEGER NOT NULL,
    "content"      TEXT NOT NULL,
    "embedding"    vector(1536),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConstraintChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConstraintChunk_constraintId_idx"
    ON "ConstraintChunk"("constraintId");

-- IVFFlat index for approximate nearest neighbour search
CREATE INDEX IF NOT EXISTS "ConstraintChunk_embedding_idx"
    ON "ConstraintChunk" USING ivfflat ("embedding" vector_cosine_ops)
    WITH (lists = 10);

ALTER TABLE "ConstraintChunk"
    ADD CONSTRAINT "ConstraintChunk_constraintId_fkey"
    FOREIGN KEY ("constraintId")
    REFERENCES "DomainConstraint"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
