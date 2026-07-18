import { Hono } from 'hono';

const authRouter = new Hono();

// This endpoint receives webhooks from Clerk to sync user/org data
authRouter.post('/webhooks/clerk', async (c) => {
  // TODO: Verify Clerk Webhook Signature
  // For now, we stub this out to focus on the architecture
  const body = await c.req.json();
  
  console.log('Received Clerk Webhook:', body.type);

  // Example: if (body.type === 'user.created') { db.insert(users).values(...) }
  
  return c.json({ success: true });
});

export { authRouter };
