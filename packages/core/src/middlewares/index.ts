import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import crypto from 'node:crypto';
import { db } from '../db';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';

// Re-export standard middlewares
export const globalLogger = logger();
export const globalCors = cors();

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
