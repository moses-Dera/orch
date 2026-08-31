import { TOOL_EMBEDDINGS } from './toolEmbeddings';

const GEMINI_EMBEDDING_MODEL = 'models/gemini-embedding-001';

/**
 * Calculates cosine similarity between two vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieves the most relevant internal tools for a given user query using semantic search.
 */
export async function retrieveTools(query: string, topK: number = 3): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Tool Retriever] GEMINI_API_KEY not set. Returning all tools as fallback.');
    return TOOL_EMBEDDINGS.map(t => t.name);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMINI_EMBEDDING_MODEL,
        content: { parts: [{ text: query }] },
      }),
    });

    if (!res.ok) {
      console.warn(`[Tool Retriever] Gemini API error ${res.status}. Returning all tools.`);
      return TOOL_EMBEDDINGS.map(t => t.name);
    }

    const data = await res.json() as any;
    const queryEmbedding = data.embedding.values as number[];

    // Calculate similarities
    const scoredTools = TOOL_EMBEDDINGS.map(tool => ({
      name: tool.name,
      score: cosineSimilarity(queryEmbedding, tool.embedding)
    }));

    // Sort by descending score
    scoredTools.sort((a, b) => b.score - a.score);

    // Return top K tool names
    return scoredTools.slice(0, topK).map(t => t.name);
  } catch (error) {
    console.warn('[Tool Retriever] Error embedding query:', error);
    return TOOL_EMBEDDINGS.map(t => t.name);
  }
}
