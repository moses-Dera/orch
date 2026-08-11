import { Hono } from 'hono';
import { apiAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, tokenBudgets } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

const proxyRouter = new Hono();

// The core AI proxy endpoint
proxyRouter.post('/chat/completions', apiAuthMiddleware, async (c) => {

  // 2. Parse OpenAI-compatible payload
  const body = await c.req.json();
  
  const teamId = c.get('teamId') as string;
  
  // 3. Fetch Constraints
  const teamConstraints = await db.select()
    .from(constraints)
    .where(eq(constraints.teamId, teamId))
    .orderBy(desc(constraints.createdAt));
    
  const systemConstraints = teamConstraints.map(c => `- ${c.content}`).join('\n');
  
  // 3.5 Token Budget Enforcement
  const [budgetRecord] = await db.select()
    .from(tokenBudgets)
    .where(eq(tokenBudgets.teamId, teamId));

  if (budgetRecord && budgetRecord.consumedTokens >= budgetRecord.allocatedTokens) {
    return c.json({ 
      error: 'Payment Required', 
      message: 'Agent Token Budget Exceeded. Please contact your organization administrator to increase limits.' 
    }, 402);
  }

  // Inject constraints into the system message
  const messages = [
    { role: 'system', content: systemConstraints },
    ...(body.messages || [])
  ];

  // 4. Forward to OpenRouter
  // We use standard fetch since Bun's fetch is blazingly fast
  const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({ ...body, messages })
  });

  // 5. Stream the response directly back to the IDE/Client
  return new Response(openRouterRes.body, {
    headers: openRouterRes.headers
  });
});

export { proxyRouter };
