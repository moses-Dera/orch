import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { apiAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, projects, tokenBudgets, models } from '../db/schema';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { retrieveChunks } from '../ai/retriever';
import type { AppVariables } from '../types';

export const orchestrateRouter = new Hono<{ Variables: AppVariables }>();

// Implementation for legacy POST /orchestrate used by Dashboard Chat
orchestrateRouter.post('/orchestrate', apiAuthMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const teamId = c.get('teamId');
    const { user_prompt, domain, model, session_id } = body;

    // 1. Budget Enforcement
    const [budgetRecord] = await db.select()
      .from(tokenBudgets)
      .where(eq(tokenBudgets.teamId, teamId));

    if (budgetRecord && budgetRecord.consumedTokens >= budgetRecord.allocatedTokens) {
      return c.json({
        error: 'Payment Required',
        message: 'Agent Token Budget Exceeded. Please contact your organization administrator to increase limits.'
      }, 402);
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

    const teamModels = await db.select().from(models).where(eq(models.teamId, teamId));
    const defaultModel = teamModels[0]?.modelId || model || 'openai/gpt-4o-mini';

    // 3. OpenRouter call
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
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

    // 4. Update Token Budget (Fire and Forget)
    db.update(tokenBudgets)
      .set({ consumedTokens: sql`${tokenBudgets.consumedTokens} + ${inputTokens + outputTokens}` })
      .where(eq(tokenBudgets.teamId, teamId))
      .execute()
      .catch(err => console.error('[Orchestrate] Failed to update token budget:', err));

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

  const [budgetRecord] = await db.select()
    .from(tokenBudgets)
    .where(eq(tokenBudgets.teamId, teamId));

  if (budgetRecord && budgetRecord.consumedTokens >= budgetRecord.allocatedTokens) {
    return c.text('data: {"error": "Payment Required - Token Budget Exceeded"}\n\ndata: [DONE]\n', 402);
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

  const teamModels = await db.select().from(models).where(eq(models.teamId, teamId));
  const defaultModel = teamModels[0]?.modelId || model || 'openai/gpt-4o-mini';

  const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
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

      // Update token budget
      const totalTokens = totalPromptTokens + totalCompletionTokens;
      if (totalTokens > 0) {
        db.update(tokenBudgets)
          .set({ consumedTokens: sql`${tokenBudgets.consumedTokens} + ${totalTokens}` })
          .where(eq(tokenBudgets.teamId, teamId))
          .execute()
          .catch(err => console.error('[Orchestrate] Failed to update token budget:', err));
      }
    }
  });
});
