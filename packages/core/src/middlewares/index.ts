import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';

// Re-export standard middlewares
export const globalLogger = logger();
export const globalCors = cors();

// Custom Middleware: Verifies API Keys for the AI Gateway
export const apiAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer orch_')) {
    return c.json({ error: 'Unauthorized: Missing or invalid API key' }, 401);
  }
  
  // Example: Here we could query Drizzle to validate the hash
  // const isValid = await db.query...
  
  await next();
});
