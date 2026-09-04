import { Hono } from 'hono';
import { apiAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, projects, models, tokenBudgets } from '../db/schema';
import { desc, eq, inArray, sql, and } from 'drizzle-orm';
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
  let isTrial = c.get('isTrial'); // Use let so we can override it

  // 2. Fetch custom API key (BYOK Enforcement)
  let apiKey: string | null = null;
  let teamModels: any[] = [];

  if (isTrial) {
    // Trial mode — use env vars directly, no DB lookup
    apiKey = process.env.TRIAL_API_KEY || null;
    if (!apiKey) {
      return c.json({
        error: 'Payment Required',
        message: 'No API key provided and no TRIAL_API_KEY configured. Please add your API key in the Orch dashboard.'
      }, 402);
    }
  } else {
    teamModels = await db.select().from(models).where(eq(models.teamId, teamId));
    const encryptedApiKey = teamModels[0]?.apiKey;
    apiKey = encryptedApiKey ? decrypt(encryptedApiKey) : null;

    if (!apiKey) {
      apiKey = process.env.TRIAL_API_KEY || null;
      if (!apiKey) {
        return c.json({
          error: 'Payment Required',
          message: 'No API key provided and no TRIAL_API_KEY configured. Please add your API key in the Orch dashboard.'
        }, 402);
      }
      // If we are falling back to the trial key for a logged-in user, treat this request as a trial
      isTrial = true;
    }
  }

  // Enforce Trial Token Budget & Fetch Projects in parallel
  let budgetPromise = null;
  let teamProjectsPromise = null;
  
  const reqProjectId = c.req.header('X-Orch-Project-Id');

  if (teamId) {
    if (isTrial) {
      budgetPromise = db.select().from(tokenBudgets).where(eq(tokenBudgets.teamId, teamId));
    }
    
    if (reqProjectId) {
      teamProjectsPromise = db.select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.teamId, teamId), eq(projects.id, reqProjectId)));
    } else {
      teamProjectsPromise = db.select({ id: projects.id })
        .from(projects)
        .where(eq(projects.teamId, teamId));
    }
  }

  // Override model if trial model is set
  if (isTrial && process.env.TRIAL_MODEL) {
    body.model = process.env.TRIAL_MODEL;
  }

  if (isTrial && budgetPromise) {
    const budgetRes = await budgetPromise;
    const budget = budgetRes[0];
    if (budget && budget.consumedTokens >= budget.allocatedTokens) {
      return c.json({
        error: 'Trial Expired',
        message: 'Your free trial credits have been exhausted. Please add your own API key in the Orch dashboard under Settings → Models to continue using the AI features.',
        action: 'add_api_key',
        settingsUrl: '/models'
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
  //    In trial mode, teamId is empty so DB queries return nothing — trial users get no constraints
  let systemConstraints = '';

  if (teamId && teamProjectsPromise) {
    try {
      const teamProjects = await teamProjectsPromise;
      const projectIds = teamProjects.map((p) => p.id);

      const teamConstraints = projectIds.length > 0
        ? await db.select({ id: constraints.id }).from(constraints).where(inArray(constraints.projectId, projectIds)).orderBy(desc(constraints.createdAt))
        : [];

      const constraintIds = teamConstraints.map((c) => c.id);

      // 6. RAG: Retrieve semantically relevant constraint chunks
      //    Falls back to full content dump if embeddings aren't ready yet
      if (constraintIds.length > 0 && lastUserMessage) {
        try {
          const chunks = await retrieveChunks(lastUserMessage, constraintIds);
          if (chunks.length > 0) {
            systemConstraints = chunks.map((chunk) => `- ${chunk.chunkText}`).join('\n');
          } else {
            const fullConstraints = projectIds.length > 0
              ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds))
              : [];
            systemConstraints = fullConstraints.map((c) => `- ${c.content}`).join('\n');
          }
        } catch (ragErr) {
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

    } catch (dbErr) {
      console.warn('[Proxy] Could not fetch constraints:', dbErr);
    }
  }

  // 7. Inject relevant constraints into the system message (only if non-empty)
  const messages = [
    ...(systemConstraints.trim().length > 0 ? [{ role: 'system', content: systemConstraints }] : []),
    ...trimmedMessages,
  ];

  // Determine endpoint
  let endpoint = teamModels[0]?.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
  if (isTrial) {
    if (process.env.TRIAL_API_URL) {
      endpoint = process.env.TRIAL_API_URL;
      if (!endpoint.endsWith('/chat/completions')) {
        endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
      }
    } else {
      const provider = (process.env.TRIAL_PROVIDER || 'openrouter').toLowerCase();
      if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      else if (provider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
      else if (provider === 'fireworks') endpoint = 'https://api.fireworks.ai/inference/v1/chat/completions';
      else if (provider === 'ollama') endpoint = 'http://127.0.0.1:11434/v1/chat/completions'; // Local Ollama
      else if (provider === 'nvidia') endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
      else endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    }
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

  // 8. Forward to provider (55s timeout — stays under Vercel's 60s hard limit)
  const openRouterRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ ...body, messages }),
    signal: AbortSignal.timeout(55000),
  });

  // 9. Handle trial exhaustion — intercept provider errors and show a friendly message
  if (isTrial && !openRouterRes.ok) {
    const status = openRouterRes.status;
    // 401/402/403/429 all indicate the trial key is exhausted, invalid, or rate-limited
    if (status === 401 || status === 402 || status === 403 || status === 429) {
      return c.json({
        error: 'Trial Expired',
        message: 'Your free trial credits have been exhausted. Please add your own API key in the Orch dashboard under Settings → Models to continue using the AI features.',
        action: 'add_api_key',
        settingsUrl: '/models'
      }, 402);
    }
  }

  // 10. Stream the response directly back to the IDE/Client
  const resHeaders = new Headers(openRouterRes.headers);
  if (isTrial) resHeaders.set('X-Orch-Trial', 'true');

  if (!openRouterRes.body) {
    return new Response(null, { headers: resHeaders, status: openRouterRes.status });
  }

  const finalHeaders = new Headers(resHeaders);
  finalHeaders.delete('content-encoding');
  finalHeaders.delete('content-length');
  finalHeaders.delete('transfer-encoding');

  // 11. Pass-through stream with usage tracking
  let totalTokens = 0;
  let usageTracked = false;

  const transform = new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      // We track usage for all logged-in teams (trial or BYOK)
      if (teamId && !usageTracked) {
        try {
          const text = new TextDecoder().decode(chunk);
          // Regex to lazily find total_tokens in the SSE stream
          const usageMatch = text.match(/"total_tokens"\s*:\s*(\d+)/);
          if (usageMatch) {
            totalTokens = parseInt(usageMatch[1], 10);
            usageTracked = true;
          }
        } catch (e) {
          // Ignore parsing errors for partial chunks
        }
      }
    },
    async flush() {
      if (usageTracked && totalTokens > 0) {
        try {
          // Increment the token budget asynchronously
          await db.update(tokenBudgets)
            .set({ consumedTokens: sql`${tokenBudgets.consumedTokens} + ${totalTokens}` })
            .where(eq(tokenBudgets.teamId, teamId));
        } catch (e) {
          console.error('[Proxy] Failed to update token budget:', e);
        }
      }
    }
  });

  return new Response(openRouterRes.body.pipeThrough(transform), {
    status: openRouterRes.status,
    statusText: openRouterRes.statusText,
    headers: finalHeaders
  });
});

export { proxyRouter };
