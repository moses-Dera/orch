import { db } from '../db';
import { sql } from 'drizzle-orm';

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K || '6', 10);
const GEMINI_EMBEDDING_MODEL = 'models/gemini-embedding-001';

/**
 * Embed a query string using the Google Gemini Embeddings API.
 * Free tier: 1,500 requests/day — no credit card required.
 */
async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. RAG retrieval unavailable.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GEMINI_EMBEDDING_MODEL,
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini Embedding API error ${res.status}: ${err}`);
  }

  const data = await res.json() as any;
  return data.embedding.values as number[];
}

/**
 * Retrieve the top-K most semantically relevant constraint chunks for a given query,
 * scoped to a specific list of constraint IDs (belonging to the team).
 *
 * Uses pgvector cosine distance (<=>).
 * IDs are passed as parameterized values — no sql.raw() interpolation (prevents SQL injection).
 */
export async function retrieveChunks(
  query: string,
  constraintIds?: string[],
  topK: number = DEFAULT_TOP_K,
): Promise<{ constraintId: string; chunkText: string }[]> {
  const queryEmbedding = await embedQuery(query);
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  // Use Drizzle's parameterized sql tag for the ID array — safe from SQL injection
  let result: Array<{ chunk_text: string; constraint_id: string }>;
  if (constraintIds && constraintIds.length > 0) {
    result = await db.execute<{ chunk_text: string; constraint_id: string }>(sql`
      SELECT chunk_text, constraint_id
      FROM constraint_chunks
      WHERE constraint_id = ANY(${constraintIds}::text[])
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `);
  } else {
    result = await db.execute<{ chunk_text: string; constraint_id: string }>(sql`
      SELECT chunk_text, constraint_id
      FROM constraint_chunks
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `);
  }

  // db.execute() with postgres.js returns a RowList which extends Array directly
  return (result as unknown as Array<{ chunk_text: string; constraint_id: string }>).map((r) => ({
    constraintId: r.constraint_id,
    chunkText: r.chunk_text
  }));
}
