DROP INDEX IF EXISTS constraint_chunks_embedding_idx;
TRUNCATE TABLE constraint_chunks;
ALTER TABLE constraint_chunks ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384);
CREATE INDEX constraint_chunks_embedding_idx ON constraint_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
