import { db } from '../db';
import { sql } from 'drizzle-orm';

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K || '6', 10);
const GEMINI_EMBEDDING_MODEL = 'models/gemini-embedding-001';

import { pipeline } from '@xenova/transformers';

class Embedder {
  static instance: any = null;
  static async getInstance() {
    if (!this.instance) {
      this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true, // Use int8 for speed
      });
    }
    return this.instance;
  }
}

/**
 * Embed a query string using local HuggingFace transformers.
 */
async function embedQuery(text: string): Promise<number[]> {
  const embedder = await Embedder.getInstance();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
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
  try {
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

    return (result as unknown as Array<{ chunk_text: string; constraint_id: string }>).map((r) => ({
      constraintId: r.constraint_id,
      chunkText: r.chunk_text
    }));
  } catch (error) {
    console.error('[RAG] Retrieval failed, falling back to basic Top-K:', error);
    
    let fallbackResult: Array<{ chunk_text: string; constraint_id: string }>;
    if (constraintIds && constraintIds.length > 0) {
      fallbackResult = await db.execute<{ chunk_text: string; constraint_id: string }>(sql`
        SELECT chunk_text, constraint_id
        FROM constraint_chunks
        WHERE constraint_id = ANY(${constraintIds}::text[])
        ORDER BY created_at DESC
        LIMIT ${topK}
      `);
    } else {
      fallbackResult = await db.execute<{ chunk_text: string; constraint_id: string }>(sql`
        SELECT chunk_text, constraint_id
        FROM constraint_chunks
        ORDER BY created_at DESC
        LIMIT ${topK}
      `);
    }
    
    return (fallbackResult as unknown as Array<{ chunk_text: string; constraint_id: string }>).map((r) => ({
      constraintId: r.constraint_id,
      chunkText: r.chunk_text
    }));
  }
}
