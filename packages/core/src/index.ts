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

import { sendEmail } from './services/email';

// Public Email Test Route
app.get('/test-email', async (c) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'test@example.com';
    await sendEmail({
      to: adminEmail,
      subject: 'Orch: Gmail API Test Successful! 🎉',
      html: `
        <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #333;">
          <h2 style="color: #10b981; margin: 0;">It works!</h2>
          <p>Your Gmail API integration on Render is configured perfectly.</p>
        </div>
      `
    });
    return c.json({ success: true, message: `Test email sent to ${adminEmail}` });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
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
