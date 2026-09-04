import { db } from '../db';
import { constraintChunks, publicSkillChunks } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const CHUNK_SIZE = 300;   // ~300 tokens per chunk
const CHUNK_OVERLAP = 50; // 50-token overlap between chunks
const GEMINI_EMBEDDING_MODEL = 'models/gemini-embedding-001';

/**
 * Split text into overlapping chunks by approximate token count.
 * Uses word boundaries — no external tokeniser needed.
 */
function chunkText(text: string): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP; // slide window with overlap
  }

  return chunks;
}

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
 * Embed a single string using local HuggingFace transformers.
 * Model: all-MiniLM-L6-v2, 384 dimensions.
 */
async function embedText(text: string): Promise<number[]> {
  const embedder = await Embedder.getInstance();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Format a float[] as a pgvector literal string: '[0.1,0.2,...]'
 */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Embed all chunks of a constraint and upsert them into the DB.
 * Old chunks for this constraint are deleted first (re-embed on update).
 */
export async function embedConstraint(constraintId: string, content: string): Promise<void> {
  const chunks = chunkText(content);
  if (chunks.length === 0) return;

  // Delete stale chunks for this constraint (handles updates)
  await db.delete(constraintChunks).where(eq(constraintChunks.constraintId, constraintId));

  // Embed all chunks sequentially (keeps rate limit manageable)
  for (let i = 0; i < chunks.length; i++) {
    const text = chunks[i];
    const embedding = await embedText(text);
    const vectorLiteral = toVectorLiteral(embedding);

    // Insert using raw SQL for the vector cast — Drizzle doesn't have a native vector type
    await db.execute(sql`
      INSERT INTO constraint_chunks (id, constraint_id, chunk_index, chunk_text, embedding, created_at)
      VALUES (
        gen_random_uuid(),
        ${constraintId},
        ${i},
        ${text},
        ${vectorLiteral}::vector,
        NOW()
      )
    `);
  }

  console.log(`[RAG] Embedded ${chunks.length} chunk(s) for constraint "${constraintId}"`);
}

/**
 * Embed all chunks of a public skill rule and upsert them into the DB.
 */
export async function embedPublicSkillRule(ruleId: string, content: string): Promise<void> {
  const chunks = chunkText(content);
  if (chunks.length === 0) return;

  await db.delete(publicSkillChunks).where(eq(publicSkillChunks.ruleId, ruleId));

  for (let i = 0; i < chunks.length; i++) {
    const text = chunks[i];
    const embedding = await embedText(text);
    const vectorLiteral = toVectorLiteral(embedding);

    await db.execute(sql`
      INSERT INTO public_skill_chunks (id, rule_id, chunk_index, chunk_text, embedding, created_at)
      VALUES (
        gen_random_uuid(),
        ${ruleId},
        ${i},
        ${text},
        ${vectorLiteral}::vector,
        NOW()
      )
    `);
  }

  console.log(`[RAG] Embedded ${chunks.length} chunk(s) for public skill rule "${ruleId}"`);
}

