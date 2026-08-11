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
 */
export async function retrieveChunks(
  query: string,
  constraintIds: string[],
  topK: number = DEFAULT_TOP_K,
): Promise<string[]> {
  if (constraintIds.length === 0) return [];

  const queryEmbedding = await embedQuery(query);
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  // Cosine similarity search scoped to the team's constraint IDs
  const idsArray = constraintIds.map((id) => `'${id}'`).join(',');

  const result = await db.execute<{ chunk_text: string }>(sql`
    SELECT chunk_text
    FROM constraint_chunks
    WHERE constraint_id = ANY(ARRAY[${sql.raw(idsArray)}]::text[])
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `);

  // db.execute() with postgres.js returns a RowList which extends Array directly
  return (result as unknown as Array<{ chunk_text: string }>).map((r) => r.chunk_text);
}
