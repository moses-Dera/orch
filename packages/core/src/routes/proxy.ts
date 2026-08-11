import { Hono } from 'hono';
import { apiAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, projects, tokenBudgets } from '../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { retrieveChunks } from '../ai/retriever';
import type { AppVariables } from '../types';

const proxyRouter = new Hono<{ Variables: AppVariables }>();

const CHAT_HISTORY_LIMIT = parseInt(process.env.CHAT_HISTORY_LIMIT || '10', 10);

// The core AI proxy endpoint
proxyRouter.post('/chat/completions', apiAuthMiddleware, async (c) => {

  // 1. Parse OpenAI-compatible payload
  const body = await c.req.json();
  const teamId = c.get('teamId');

  // 2. Token Budget Enforcement
  const [budgetRecord] = await db.select()
    .from(tokenBudgets)
    .where(eq(tokenBudgets.teamId, teamId));

  if (budgetRecord && budgetRecord.consumedTokens >= budgetRecord.allocatedTokens) {
    return c.json({
      error: 'Payment Required',
      message: 'Agent Token Budget Exceeded. Please contact your organization administrator to increase limits.'
    }, 402);
  }

  // 3. Trim conversation history to the sliding window
  const allMessages: { role: string; content: string }[] = body.messages || [];
  const trimmedMessages = allMessages.slice(-CHAT_HISTORY_LIMIT);

  // 4. Build retrieval query from the last user message
  const lastUserMessage = trimmedMessages.findLast((m) => m.role === 'user')?.content ?? '';

  // 5. Fetch constraint IDs via projects (constraints are linked to projects, not teams directly)
  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map((p) => p.id);

  const teamConstraints = projectIds.length > 0
    ? await db.select({ id: constraints.id }).from(constraints).where(inArray(constraints.projectId, projectIds)).orderBy(desc(constraints.createdAt))
    : [];

  const constraintIds = teamConstraints.map((c) => c.id);

  // 6. RAG: Retrieve semantically relevant constraint chunks
  //    Falls back to full content dump if embeddings aren't ready yet
  let systemConstraints: string;

  if (constraintIds.length > 0 && lastUserMessage) {
    try {
      const chunks = await retrieveChunks(lastUserMessage, constraintIds);
      if (chunks.length > 0) {
        systemConstraints = chunks.map((chunk) => `- ${chunk}`).join('\n');
      } else {
        // No chunks found — fall back to full content dump
        const fullConstraints = projectIds.length > 0
          ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds))
          : [];
        systemConstraints = fullConstraints.map((c) => `- ${c.content}`).join('\n');
      }
    } catch (ragErr) {
      // RAG not configured (no GEMINI_API_KEY) — graceful fallback
      console.warn('[RAG] Retrieval failed, falling back to full dump:', ragErr);
      const fullConstraints = projectIds.length > 0
        ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds))
        : [];
      systemConstraints = fullConstraints.map((c) => `- ${c.content}`).join('\n');
    }
  } else {
    const fullConstraints = projectIds.length > 0
      ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds))
      : [];
    systemConstraints = fullConstraints.map((c) => `- ${c.content}`).join('\n');
  }

  // 7. Inject relevant constraints into the system message
  const messages = [
    { role: 'system', content: systemConstraints },
    ...trimmedMessages,
  ];

  // 8. Forward to OpenRouter
  const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({ ...body, messages })
  });

  // 9. Stream the response directly back to the IDE/Client
  return new Response(openRouterRes.body, {
    headers: openRouterRes.headers
  });
});

export { proxyRouter };
