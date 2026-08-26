import { Hono } from 'hono';
import { db } from '../db';
import { models, tokenBudgets, subscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { apiAuthMiddleware } from '../middlewares';
import type { AppVariables } from '../types';

export const billingRouter = new Hono<{ Variables: AppVariables }>();

billingRouter.get('/', apiAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');
  if (!teamId) {
    return c.json({ error: 'Unauthorized or not in an organization' }, 401);
  }

  // Fetch token budget (assuming orgId acts as teamId for this MVP)
  const [budget] = await db.select().from(tokenBudgets).where(eq(tokenBudgets.teamId, teamId));
  const [configuredModel] = await db.select().from(models).where(eq(models.teamId, teamId));

  return c.json({
    budget: budget || { allocatedTokens: 100000, consumedTokens: 0 },
    hasApiKey: !!configuredModel?.apiKey,
  });
});

billingRouter.post('/key', apiAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');
  if (!teamId) {
    return c.json({ error: 'Unauthorized or not in an organization' }, 401);
  }

  const { apiKey } = await c.req.json();
  if (!apiKey || typeof apiKey !== 'string') {
    return c.json({ error: 'Invalid API key' }, 400);
  }

  // Upsert the model configuration with the API key
  const [existing] = await db.select().from(models).where(eq(models.teamId, teamId));
  
  if (existing) {
    await db.update(models)
      .set({ apiKey })
      .where(eq(models.teamId, teamId));
  } else {
    await db.insert(models).values({
      teamId: teamId,
      provider: 'openai',
      modelId: 'openai/gpt-4o',
      displayName: 'GPT-4o',
      apiKey,
    });
  }

  return c.json({ success: true });
});

// Generate a Lemon Squeezy Checkout URL (Mocked for now)
billingRouter.post('/checkout', apiAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');
  if (!teamId) {
    return c.json({ error: 'Unauthorized or not in an organization' }, 401);
  }

  // In production, this would call Lemon Squeezy API to generate a checkout URL
  // const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', ...)
  
  // For local testing, we return a mock URL
  const mockCheckoutUrl = `https://store.lemonsqueezy.com/checkout?teamId=${teamId}`;

  return c.json({ url: mockCheckoutUrl });
});

// Handle Lemon Squeezy Webhooks
billingRouter.post('/webhook', async (c) => {
  // In production, verify the webhook signature here using crypto
  const payload = await c.req.json();
  const eventName = payload.meta.event_name;
  const eventId = payload.meta.event_id;
  const customData = payload.meta.custom_data; // Should contain teamId

  if (!customData?.teamId) {
    return c.json({ error: 'Missing teamId in webhook' }, 400);
  }

  const teamId = customData.teamId;

  // Idempotency check: Have we processed this exact webhook event before?
  // We import processedWebhooks from schema dynamically to avoid modifying imports at top of file again
  const { processedWebhooks, subscriptions, tokenBudgets } = await import('../db/schema');
  
  const [alreadyProcessed] = await db.select().from(processedWebhooks).where(eq(processedWebhooks.eventId, eventId));
  if (alreadyProcessed) {
    return c.json({ success: true, message: 'Webhook already processed (idempotent)' });
  }

  if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
    const data = payload.data.attributes;
    const status = data.status; // e.g., 'active'
    
    // Upsert subscription record
    const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.teamId, teamId));
    
    if (existing) {
      await db.update(subscriptions)
        .set({ status, renewsAt: new Date(data.renews_at), updatedAt: new Date() })
        .where(eq(subscriptions.teamId, teamId));
    } else {
      await db.insert(subscriptions).values({
        teamId,
        lemonSqueezyId: payload.data.id,
        status,
        planId: data.variant_id?.toString() || 'pro',
        renewsAt: new Date(data.renews_at),
      });
    }

    // Give them tokens if active
    if (status === 'active') {
      const [budget] = await db.select().from(tokenBudgets).where(eq(tokenBudgets.teamId, teamId));
      if (budget) {
        await db.update(tokenBudgets)
          .set({ allocatedTokens: budget.allocatedTokens + 1000000, updatedAt: new Date() })
          .where(eq(tokenBudgets.teamId, teamId));
      } else {
        await db.insert(tokenBudgets).values({
          teamId,
          allocatedTokens: 1000000,
          consumedTokens: 0,
        });
      }
    }
  }

  // Mark this event as processed so we never double-credit them on retries
  await db.insert(processedWebhooks).values({
    eventId,
    eventName,
  });

  return c.json({ success: true });
});
