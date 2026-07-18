import { Hono } from 'hono';
import { globalLogger, globalCors } from './middlewares';
import { authRouter } from './routes/auth';
import { proxyRouter } from './routes/proxy';

const app = new Hono();

// Global Middleware
app.use('*', globalLogger);
app.use('*', globalCors);

// Health Check
app.get('/', (c) => {
  return c.text('Orch Core API running smoothly on Bun.');
});

// Register Routers
const routes = app
  .route('/api/auth', authRouter)
  .route('/v1', proxyRouter);

// Export the AppType so the Dashboard and CLI can consume Hono RPC
export type AppType = typeof routes;

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
};
