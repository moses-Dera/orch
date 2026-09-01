import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { apiAuthMiddleware, llmProviderMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, projects } from '../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { retrieveChunks } from '../ai/retriever';
import { createParser } from 'eventsource-parser';
import type { AppVariables } from '../types';

export const orchestrateRouter = new Hono<{ Variables: AppVariables }>();

// Implementation for legacy POST /orchestrate used by Dashboard Chat
orchestrateRouter.post('/orchestrate', apiAuthMiddleware, llmProviderMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const teamId = c.get('teamId');
    const { user_prompt, domain, session_id } = body;

    const apiKey = c.get('llmApiKey');
    const defaultModel = c.get('llmModel');
    const endpoint = c.get('llmEndpoint');

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
          systemConstraints = chunks.map((chunk) => `- ${chunk.chunkText}`).join('\n');
        }
      } catch (ragErr) {
        console.warn('[RAG] Retrieval failed, falling back to full dump:', ragErr);
      }
    }

    const messages = [
      { role: 'system', content: systemConstraints },
      { role: 'user', content: user_prompt }
    ];

    // 3. LLM call
    const llmRes = await fetch(endpoint, {
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

    const responseData = await llmRes.json() as any;
    const inputTokens = responseData.usage?.prompt_tokens || 0;
    const outputTokens = responseData.usage?.completion_tokens || 0;
    const outputText = responseData.choices?.[0]?.message?.content || '';

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
    return c.json({ error: 'Internal server error. Please try again.' }, 500);
  }
});

import { OrchestrationService } from '../services/orchestration.service';

// Implementation for legacy POST /orchestrate/stream used by VS Code Extension and Dashboard
orchestrateRouter.post('/orchestrate/stream', apiAuthMiddleware, llmProviderMiddleware, async (c) => {
  const body = await c.req.json();
  const teamId = c.get('teamId');
  const apiKey = c.get('llmApiKey');
  const defaultModel = c.get('llmModel');
  const endpoint = c.get('llmEndpoint');

  const llmRes = await OrchestrationService.generate({
    teamId,
    userPrompt: body.user_prompt,
    inboundMessages: body.messages,
    apiKey,
    endpoint,
    model: defaultModel,
    stream: true
  });

  if (!llmRes.ok || !llmRes.body) {
    console.error('LLM upstream error:', await llmRes.text());
    return c.text('data: {"error": "Upstream error"}\n\ndata: [DONE]\n', 500);
  }

  // Proxy the stream back to the client directly (OpenAI SSE format)
  return new Response(llmRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
});
