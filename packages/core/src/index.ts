import { Hono } from 'hono';
import { globalLogger, globalCors } from './middlewares';
import { authRouter } from './routes/auth';
import { proxyRouter } from './routes/proxy';
import { syncRouter } from './routes/sync';
import { reviewRouter } from './routes/review';
import { dashboardRouter } from './routes/dashboard';
import { onboardingRouter } from './routes/onboarding';
import { githubRouter } from './routes/github';
import { billingRouter } from './routes/billing';
import { orchestrateRouter } from './routes/orchestrate';

const app = new Hono();

// Global Middleware
app.use('*', globalLogger);
app.use('*', globalCors);

// Health Check
app.get('/', (c) => {
  return c.text('Orch Core API running smoothly on Bun.');
});

// Global Error Handlers
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

app.onError((err, c) => {
  console.error(`[Global Error] ${err}`);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

import { clerkMiddleware } from '@hono/clerk-auth';

import { mcpRouter } from './routes/mcp';

// Register Routers
const routes = app
  .route('/api/auth', authRouter)
  .route('/v1', proxyRouter)
  .route('/v1', syncRouter)
  .route('/v1', reviewRouter)
  .route('/v1/dashboard', dashboardRouter)
  .route('/v1/github', githubRouter)
  .use('/v1/billing/*', clerkMiddleware())
  .route('/v1/billing', billingRouter)
  .route('/api/v1/onboarding', onboardingRouter)
  .route('/v1', orchestrateRouter)
  .route('/v1/mcp', mcpRouter);

// Export the AppType so the Dashboard and CLI can consume Hono RPC
export type AppType = typeof routes;

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
};
