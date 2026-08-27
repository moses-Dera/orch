import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { apiAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, projects, tokenBudgets, models } from '../db/schema';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { retrieveChunks } from '../ai/retriever';
import { decrypt } from '../utils/encryption';
import type { AppVariables } from '../types';

export const orchestrateRouter = new Hono<{ Variables: AppVariables }>();

// Implementation for legacy POST /orchestrate used by Dashboard Chat
orchestrateRouter.post('/orchestrate', apiAuthMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const teamId = c.get('teamId');
    const { user_prompt, domain, model, session_id } = body;

    // 1. Fetch BYOK API Key
    const teamModels = await db.select().from(models).where(eq(models.teamId, teamId));
    const modelObj = teamModels[0];
    const encryptedApiKey = modelObj?.apiKey;
    let apiKey = encryptedApiKey ? decrypt(encryptedApiKey) : null;
    let isTrial = false;
    let defaultModel = modelObj?.modelId || model || 'openai/gpt-4o-mini';

    if (!apiKey) {
      apiKey = process.env.TRIAL_API_KEY || null;
      isTrial = true;
      if (!apiKey) {
        return c.json({
          error: 'Payment Required',
          message: 'No API key provided and no TRIAL_API_KEY configured. Please add your API key in the Orch dashboard.'
        }, 402);
      }
    }

    if (isTrial && process.env.TRIAL_MODEL) {
      defaultModel = process.env.TRIAL_MODEL;
    }

    // 2. Fetch constraints & RAG
    const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
    const projectIds = teamProjects.map((p) => p.id);
    const teamConstraints = projectIds.length > 0
      ? await db.select({ id: constraints.id, content: constraints.content }).from(constraints).where(inArray(constraints.projectId, projectIds)).orderBy(desc(constraints.createdAt))
      : [];

    const constraintIds = teamConstraints.map((c) => c.id);
    let systemConstraints = teamConstraints.map((c) => `- ${c.content}`).join('\n');

    if (constraintIds.length > 0 && user_prompt) {
      try {
        const chunks = await retrieveChunks(user_prompt, constraintIds);
        if (chunks.length > 0) {
          systemConstraints = chunks.map((chunk) => `- ${chunk}`).join('\n');
        }
      } catch (ragErr) {
        console.warn('[RAG] Retrieval failed, falling back to full dump:', ragErr);
      }
    }

    const messages = [
      { role: 'system', content: systemConstraints },
      { role: 'user', content: user_prompt }
    ];

    // 3. OpenRouter call

    let endpoint = modelObj?.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
    if (isTrial) {
      if (process.env.TRIAL_API_URL) {
        endpoint = process.env.TRIAL_API_URL;
        if (!endpoint.endsWith('/chat/completions')) {
          endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
        }
      } else {
        const provider = (process.env.TRIAL_PROVIDER || 'openrouter').toLowerCase();
        if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
        else if (provider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
        else if (provider === 'fireworks') endpoint = 'https://api.fireworks.ai/inference/v1/chat/completions';
        else if (provider === 'ollama') endpoint = 'http://127.0.0.1:11434/v1/chat/completions';
        else endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      }
    }

    // 3. OpenRouter call
    const openRouterRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: defaultModel,
        messages
      })
    });

    const responseData = await openRouterRes.json() as any;
    const inputTokens = responseData.usage?.prompt_tokens || 0;
    const outputTokens = responseData.usage?.completion_tokens || 0;
    const outputText = responseData.choices?.[0]?.message?.content || '';

    // 4. Update Token Budget skipped (BYOK model)

    return c.json({
      domain_identified: domain || 'auto',
      model_executed: defaultModel,
      session_id: session_id || `sess_${Date.now()}`,
      structured_output: outputText,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      key_source: 'team_config'
    });
  } catch (err: any) {
    console.error('Orchestrate ERROR:', err);
    return c.json({ error: err.message, stack: err.stack }, 500);
  }
});

// Implementation for legacy POST /orchestrate/stream used by VS Code Extension
orchestrateRouter.post('/orchestrate/stream', apiAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const teamId = c.get('teamId');
  const { user_prompt, domain, model, session_id } = body;

  const teamModels = await db.select().from(models).where(eq(models.teamId, teamId));
  const modelObj = teamModels[0];
  const encryptedApiKey = modelObj?.apiKey;
  let apiKey = encryptedApiKey ? decrypt(encryptedApiKey) : null;
  let isTrial = false;
  let defaultModel = modelObj?.modelId || model || 'openai/gpt-4o-mini';

  if (!apiKey) {
    apiKey = process.env.TRIAL_API_KEY || null;
    isTrial = true;
    if (!apiKey) {
      return c.text('data: {"error": "Payment Required - No API key provided"}\n\ndata: [DONE]\n', 402);
    }
  }

  if (isTrial && process.env.TRIAL_MODEL) {
    defaultModel = process.env.TRIAL_MODEL;
  }

  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map((p) => p.id);
  const teamConstraints = projectIds.length > 0
    ? await db.select({ id: constraints.id, content: constraints.content }).from(constraints).where(inArray(constraints.projectId, projectIds)).orderBy(desc(constraints.createdAt))
    : [];

  const constraintIds = teamConstraints.map((c) => c.id);
  let systemConstraints = teamConstraints.map((c) => `- ${c.content}`).join('\n');

  if (constraintIds.length > 0 && user_prompt) {
    try {
      const chunks = await retrieveChunks(user_prompt, constraintIds);
      if (chunks.length > 0) {
        systemConstraints = chunks.map((chunk) => `- ${chunk}`).join('\n');
      }
    } catch (ragErr) {
      console.warn('[RAG] Retrieval failed:', ragErr);
    }
  }

  const messages = [
    { role: 'system', content: systemConstraints },
    { role: 'user', content: user_prompt }
  ];

  // OpenRouter call

  let endpoint = modelObj?.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
  if (isTrial) {
    if (process.env.TRIAL_API_URL) {
      endpoint = process.env.TRIAL_API_URL;
      if (!endpoint.endsWith('/chat/completions')) {
        endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
      }
    } else {
      const provider = (process.env.TRIAL_PROVIDER || 'openrouter').toLowerCase();
      if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      else if (provider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
      else if (provider === 'fireworks') endpoint = 'https://api.fireworks.ai/inference/v1/chat/completions';
      else if (provider === 'ollama') endpoint = 'http://127.0.0.1:11434/v1/chat/completions';
      else endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    }
  }

  const openRouterRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: defaultModel,
      messages,
      stream: true
    })
  });

  if (!openRouterRes.body) {
    return c.text('data: {"error": "Upstream error"}\n\ndata: [DONE]\n', 500);
  }

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const sessId = session_id || `sess_${Date.now()}`;
  
  return stream(c, async (stream) => {
    // Send initial meta frame
    await stream.write(`data: ${JSON.stringify({ meta: { session_id: sessId, domain: domain || 'auto', model: defaultModel } })}\n\n`);

    const reader = openRouterRes.body!.getReader();
    const decoder = new TextDecoder();
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.usage && (data.usage.prompt_tokens || data.usage.completion_tokens)) {
                totalPromptTokens += data.usage.prompt_tokens || 0;
                totalCompletionTokens += data.usage.completion_tokens || 0;
              }
              
              if (data.choices?.[0]?.delta?.content) {
                await stream.write(`data: ${JSON.stringify({ chunk: data.choices[0].delta.content })}\n\n`);
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
      await stream.write('data: [DONE]\n\n');

      // Update token budget skipped (BYOK model)
    }
  });
});
