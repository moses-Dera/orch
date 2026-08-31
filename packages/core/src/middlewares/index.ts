import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import crypto from 'node:crypto';
import { db } from '../db';
import { apiKeys, teams } from '../db/schema';
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
