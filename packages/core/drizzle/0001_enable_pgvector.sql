-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Alter embedding column from text to vector(768)
-- (matches Google Gemini text-embedding-004 output dimensions)
ALTER TABLE constraint_chunks
  ALTER COLUMN embedding TYPE vector(768)
  USING embedding::vector(768);

-- Create IVFFlat index for fast cosine similarity search
-- lists=100 is a good default for up to ~1M vectors
CREATE INDEX IF NOT EXISTS constraint_chunks_embedding_idx
  ON constraint_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
