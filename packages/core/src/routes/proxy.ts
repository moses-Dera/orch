import { Hono } from 'hono';
import { apiAuthMiddleware } from '../middlewares';

const proxyRouter = new Hono();

// The core AI proxy endpoint
proxyRouter.post('/chat/completions', apiAuthMiddleware, async (c) => {

  // 2. Parse OpenAI-compatible payload
  const body = await c.req.json();
  
  // 3. TODO: Retrieve constraints from Drizzle using pgvector RAG
  const systemConstraints = "Constraint: Use Bun and Drizzle ORM. Do not use Python.";
  
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
