import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import crypto from 'node:crypto';
import { db } from '../db';
import { apiKeys, teams, models } from '../db/schema';
import { decrypt } from '../utils/encryption';
import { eq } from 'drizzle-orm';

// Re-export standard middlewares
export const globalLogger = logger();

// Restrict CORS to known origins only (Bug #7 fix: was cors() with no options = allow all)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

export const globalCors = cors({
  origin: (origin) => {
    if (!origin) return null; // non-browser / server-to-server requests
    if (allowedOrigins.some((allowed) => origin === allowed || origin.endsWith(`.${allowed.replace('https://', '')}`))) {
      return origin;
    }
    return null; // reject unknown origins
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Clerk-User-Id'],
  credentials: true,
});

// Custom Middleware: Verifies API Keys for the AI Gateway
export const apiAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer orch_')) {
    return c.json({ error: 'Unauthorized: Missing or invalid API key' }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  
  // Trial mode: orch_dummy token bypasses DB lookup
  if (token === 'orch_dummy' && process.env.TRIAL_API_KEY) {
    c.set('isTrial', true);
    
    const clerkId = c.req.header('X-Clerk-User-Id');
    if (clerkId) {
      const userTeams = await db.select().from(teams).where(eq(teams.userId, clerkId));
      if (userTeams.length > 0) {
        c.set('teamId', userTeams[0].id);
        return await next();
      }
    }
    
    c.set('teamId', '');
    return await next();
  }

  c.set('isTrial', false);
  const keyHash = crypto.createHash('sha256').update(token).digest('hex');

  const [apiKeyRecord] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));

  if (!apiKeyRecord) {
    return c.json({ error: 'Unauthorized: Invalid API key' }, 401);
  }
  
  c.set('teamId', apiKeyRecord.teamId);
  await next();
});

// Custom Middleware: Verifies API Keys for the CLI
export const cliAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid API key' }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  const keyHash = crypto.createHash('sha256').update(token).digest('hex');

  const [apiKeyRecord] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));

  if (!apiKeyRecord) {
    return c.json({ error: 'Unauthorized: Invalid API key' }, 401);
  }
  
  c.set('teamId', apiKeyRecord.teamId);
  await next();
});

// Custom Middleware: Resolves BYOK configuration and handles Custom Endpoints


export const llmProviderMiddleware = createMiddleware(async (c, next) => {
  const teamId = c.get('teamId');
  if (!teamId) {
    return c.json({ error: 'Team context required' }, 400);
  }

  // Parse body for requested model overrides (if any)
  let requestedModel = 'openai/gpt-4o-mini';
  try {
    const bodyClone = await c.req.raw.clone().json() as any;
    if (bodyClone?.model) {
      requestedModel = bodyClone.model;
    }
  } catch (e) {
    // Ignore JSON parse errors (might be a GET request)
  }

  const teamModels = await db.select().from(models).where(eq(models.teamId, teamId));
  const modelObj = teamModels[0];
  const encryptedApiKey = modelObj?.apiKey;
  let apiKey = encryptedApiKey ? decrypt(encryptedApiKey) : null;
  let isTrial = c.get('isTrial');
  let defaultModel = modelObj?.modelId || requestedModel;
  let endpoint = modelObj?.endpoint || 'https://openrouter.ai/api/v1/chat/completions';

  if (!apiKey && !isTrial) {
    apiKey = process.env.TRIAL_API_KEY || null;
    isTrial = true;
    if (!apiKey) {
      return c.json({
        error: 'Payment Required',
        message: 'No API key provided and no TRIAL_API_KEY configured. Please add your API key in the Orch dashboard.'
      }, 402);
    }
  }

  if (isTrial && process.env.TRIAL_MODEL) {
    defaultModel = process.env.TRIAL_MODEL;
  }

  // Auto-format standard endpoints based on provider rules
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
      else if (provider === 'ollama') endpoint = 'http://127.0.0.1:11434/v1/chat/completions';
      else endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    }
  } else {
    // Make sure custom endpoints append /chat/completions if they are OpenAI compatible
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
    }
  }

  c.set('llmApiKey', apiKey);
  c.set('llmModel', defaultModel);
  c.set('llmEndpoint', endpoint);
  
  await next();
});
