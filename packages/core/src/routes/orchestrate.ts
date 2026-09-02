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
    const { user_prompt, domain, session_id, project_id } = body;
    const reqProjectId = c.req.header('X-Orch-Project-Id') || project_id;

    const apiKey = c.get('llmApiKey');
    const defaultModel = c.get('llmModel');
    const endpoint = c.get('llmEndpoint');

    // 2. Fetch constraints & RAG
    let projectIds: string[] = [];
    if (reqProjectId) {
      projectIds = [reqProjectId];
    } else {
      const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
      projectIds = teamProjects.map((p) => p.id);
    }
    
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
    const totalTokens = inputTokens + outputTokens;
    const outputText = responseData.choices?.[0]?.message?.content || '';

    if (totalTokens > 0) {
      import('../db/schema').then(async ({ tokenBudgets }) => {
         const { sql } = await import('drizzle-orm');
         await db.update(tokenBudgets)
           .set({ consumedTokens: sql`${tokenBudgets.consumedTokens} + ${totalTokens}` })
           .where(eq(tokenBudgets.teamId, teamId));
      }).catch(err => console.error('Failed to update token budget:', err));
    }

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
  const reqProjectId = c.req.header('X-Orch-Project-Id') || body.project_id;

  const llmRes = await OrchestrationService.generate({
    teamId,
    projectId: reqProjectId,
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

  let totalTokens = 0; // fallback if usage isn't provided

  return stream(c, async (streamWriter) => {
    const parser = createParser({
      onEvent: (event) => {
        if (event.type === 'event') {
          streamWriter.write(`data: ${event.data}\n\n`);
          
          if (event.data !== '[DONE]') {
            try {
              const data = JSON.parse(event.data);
              // Count tokens if usage is provided
              if (data.usage) {
                totalTokens = data.usage.total_tokens || 0;
              } else if (data.choices?.[0]?.delta?.content) {
                 // naive fallback: roughly 1 token per 4 chars for english
                 totalTokens += Math.ceil(data.choices[0].delta.content.length / 4);
              }
            } catch (e) {
               // Ignore malformed JSON chunks from provider
            }
          }
        }
      }
    });

    const reader = llmRes.body!.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } finally {
      reader.releaseLock();
      
      // Update token budget in DB asynchronously if tokens were consumed
      if (totalTokens > 0) {
        import('../db/schema').then(async ({ tokenBudgets }) => {
           const { sql } = await import('drizzle-orm');
           await db.update(tokenBudgets)
             .set({ consumedTokens: sql`${tokenBudgets.consumedTokens} + ${totalTokens}` })
             .where(eq(tokenBudgets.teamId, teamId));
        }).catch(err => console.error('Failed to update token budget:', err));
      }
    }
  });
});
