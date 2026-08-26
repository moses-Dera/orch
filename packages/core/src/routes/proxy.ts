import { Hono } from 'hono';
import { apiAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, projects, models } from '../db/schema';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { retrieveChunks } from '../ai/retriever';
import { decrypt } from '../utils/encryption';
import type { AppVariables } from '../types';

const proxyRouter = new Hono<{ Variables: AppVariables }>();

const CHAT_HISTORY_LIMIT = parseInt(process.env.CHAT_HISTORY_LIMIT || '10', 10);

// The core AI proxy endpoint
proxyRouter.post('/chat/completions', apiAuthMiddleware, async (c) => {

  // 1. Parse OpenAI-compatible payload
  const body = await c.req.json();
  const teamId = c.get('teamId');

  // 2. Fetch custom API key (BYOK Enforcement)
  const teamModels = await db.select().from(models).where(eq(models.teamId, teamId));
  const encryptedApiKey = teamModels[0]?.apiKey;
  
  let apiKey = encryptedApiKey ? decrypt(encryptedApiKey) : null;
  let isTrial = false;

  if (!apiKey) {
    apiKey = process.env.TRIAL_API_KEY || null;
    isTrial = true;
    if (!apiKey) {
      return c.json({
        error: 'Payment Required',
        message: 'No API key provided and no TRIAL_API_KEY configured. Please add your API key in the Orch dashboard.'
      }, 402);
    }
  }

  // Override model if trial model is set
  if (isTrial && process.env.TRIAL_MODEL) {
    body.model = process.env.TRIAL_MODEL;
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

  // Determine endpoint
  let endpoint = teamModels[0]?.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
  if (isTrial) {
    const provider = (process.env.TRIAL_PROVIDER || 'openrouter').toLowerCase();
    if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    else if (provider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
    else endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  } else {
    // If not a trial, override the frontend's hardcoded model with the user's configured model
    if (teamModels[0]?.modelId) {
      body.model = teamModels[0].modelId;
    }
    // Custom endpoints configured in the dashboard UI are base URLs (e.g., http://localhost:11434/v1).
    // Ensure we append the chat completions route if it's missing.
    if (endpoint && !endpoint.endsWith('/chat/completions')) {
      endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
    }
  }

  // 8. Forward to provider
  const openRouterRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ ...body, messages })
  });

  // 9. Stream the response directly back to the IDE/Client
  const resHeaders = new Headers(openRouterRes.headers);
  if (isTrial) resHeaders.set('X-Orch-Trial', 'true');

  if (!openRouterRes.body) {
    return new Response(null, { headers: resHeaders, status: openRouterRes.status });
  }

  // Pass-through stream without tracking usage
  return new Response(openRouterRes.body, {
    headers: openRouterRes.headers
  });
});

export { proxyRouter };
