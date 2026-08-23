import { Hono } from 'hono';
import { db } from '../db';
import { apiKeys, constraints, models, sessions, teams, organizations, tokenBudgets, projects, githubEvaluations } from '../db/schema';
import { eq, desc, inArray, sql, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import { embedConstraint } from '../ai/embedder';
import { githubApp } from './github';
import type { AppVariables } from '../types';
import { encrypt } from '../utils/encryption';

export const dashboardRouter = new Hono<{ Variables: AppVariables }>();

// Auth Middleware: Extracts Team ID from Bearer token
dashboardRouter.use('*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const key = auth.replace('Bearer ', '');
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
  if (!apiKey) return c.json({ error: 'Unauthorized' }, 401);
  c.set('teamId', apiKey.teamId);

  // Get User ID from Clerk Header
  const userId = c.req.header('X-Clerk-User-Id');
  if (userId) c.set('userId', userId);

  await next();
});

// GET /v1/status
dashboardRouter.get('/status', async (c) => {
  const teamId = c.get('teamId');
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return c.json({ error: 'Team not found' }, 404);

  const [org] = await db.select().from(organizations).where(eq(organizations.id, team.orgId));
  
  // Join through projects — constraints link to projects, not teams directly
  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map((p) => p.id);
  const allConstraints = projectIds.length > 0
    ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds))
    : [];
  
  return c.json({
    org: org?.name ?? 'Unknown Org',
    team: team.name,
    model_policy: 'allowlist',
    enforced_model: null,
    constraint_profiles: allConstraints.map(c => ({
      id: c.id,
      description: c.description,
      version: c.version,
    }))
  });
});

// GET /v1/models
dashboardRouter.get('/models', async (c) => {
  const teamId = c.get('teamId');
  const teamModels = await db.select().from(models).where(eq(models.teamId, teamId));
  return c.json({
    policy: 'allowlist',
    models: teamModels.map(m => ({
      id: m.id,
      name: m.displayName,
      provider: m.provider,
      context_window: m.contextWindow,
      is_critic: m.isCritic,
      is_judge: m.isJudge,
      has_api_key: !!m.apiKey,
    }))
  });
});

// POST /v1/models
dashboardRouter.post('/models', async (c) => {
  const teamId = c.get('teamId');
  const body = await c.req.json();
  
  if (body.is_critic) {
    await db.update(models).set({ isCritic: false }).where(eq(models.teamId, teamId));
  }
  if (body.is_judge) {
    await db.update(models).set({ isJudge: false }).where(eq(models.teamId, teamId));
  }

  await db.insert(models).values({
    teamId,
    provider: body.provider,
    modelId: body.model_id,
    displayName: body.display_name,
    apiKey: body.api_key ? encrypt(body.api_key) : null,
    endpoint: body.endpoint,
    contextWindow: body.context_window || 8192,
    isCritic: body.is_critic || false,
    isJudge: body.is_judge || false,
  });
  return c.json({ success: true });
});

// PUT /v1/models/:id
dashboardRouter.put('/models/:id', async (c) => {
  const teamId = c.get('teamId');
  const id = c.req.param('id');
  const body = await c.req.json();

  if (body.is_critic === true) {
    await db.update(models).set({ isCritic: false }).where(eq(models.teamId, teamId));
  }
  if (body.is_judge === true) {
    await db.update(models).set({ isJudge: false }).where(eq(models.teamId, teamId));
  }

  const updateData: any = {};
  if (body.is_critic !== undefined) updateData.isCritic = body.is_critic;
  if (body.is_judge !== undefined) updateData.isJudge = body.is_judge;
  if (body.api_key) updateData.apiKey = encrypt(body.api_key);

  if (Object.keys(updateData).length > 0) {
    await db.update(models).set(updateData).where(sql`${models.id} = ${id} AND ${models.teamId} = ${teamId}`);
  }

  return c.json({ success: true });
});

// DELETE /v1/models/:id
dashboardRouter.delete('/models/:id', async (c) => {
  const teamId = c.get('teamId');
  const id = c.req.param('id');
  await db.delete(models).where(sql`${models.id} = ${id} AND ${models.teamId} = ${teamId}`);
  return c.json({ success: true });
});

// GET /v1/projects
dashboardRouter.get('/projects', async (c) => {
  const teamId = c.get('teamId');
  const teamProjects = await db.select().from(projects).where(eq(projects.teamId, teamId));
  return c.json({ projects: teamProjects });
});

// POST /v1/projects
dashboardRouter.post('/projects', async (c) => {
  const teamId = c.get('teamId');
  const body = await c.req.json();
  await db.insert(projects).values({
    teamId,
    name: body.name,
    githubRepoFullName: body.githubRepoFullName,
  });
  return c.json({ success: true });
});

// DELETE /v1/projects/:id
dashboardRouter.delete('/projects/:id', async (c) => {
  const teamId = c.get('teamId');
  const id = c.req.param('id');
  
  // Clean up children (githubEvaluations and constraints)
  await db.delete(githubEvaluations).where(eq(githubEvaluations.projectId, id));
  await db.delete(constraints).where(eq(constraints.projectId, id));
  
  // Delete the project (ensure it belongs to the team)
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.teamId, teamId)));
  
  return c.json({ success: true });
});
// GET /v1/constraints
dashboardRouter.get('/constraints', async (c) => {
  const teamId = c.get('teamId');
  
  // Need to get constraints for all projects in this team
  // For simplicity, let's fetch all projects first
  const teamProjects = await db.select().from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map(p => p.id);
  
  if (projectIds.length === 0) {
    return c.json({ constraints: [] });
  }

  // Then fetch constraints for those projects
  // Since drizzle doesn't easily do `inArray` if the array is empty, we handled it above.
  const teamConstraints = await db.select().from(constraints).where(inArray(constraints.projectId, projectIds));
  
  return c.json({
    constraints: teamConstraints.map(c => ({
      id: c.id,
      projectId: c.projectId,
      description: c.description,
      constraints: c.content,
      gpt_variant: c.gptVariant,
      claude_variant: c.claudeVariant,
      gemini_variant: c.geminiVariant,
      version: c.version,
    }))
  });
});

// GET /v1/analytics
dashboardRouter.get('/analytics', async (c) => {
  const teamId = c.get('teamId');
  
  const teamProjects = await db.select().from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map(p => p.id);
  
  if (projectIds.length === 0) {
    return c.json({ stats: { total: 0, violations: 0, clean: 0 }, recent: [] });
  }

  const evals = await db.select().from(githubEvaluations).where(inArray(githubEvaluations.projectId, projectIds)).orderBy(desc(githubEvaluations.createdAt)).limit(50);
  
  let total = 0;
  let violations = 0;
  let clean = 0;
  
  for (const ev of evals) {
    total++;
    if (ev.status === 'VIOLATION') violations++;
    if (ev.status === 'CLEAN') clean++;
  }
  
  return c.json({
    stats: { total, violations, clean },
    recent: evals.map(e => ({
      id: e.id,
      projectId: e.projectId,
      pullRequestNumber: e.pullRequestNumber,
      status: e.status,
      createdAt: e.createdAt,
      projectName: teamProjects.find(p => p.id === e.projectId)?.name || 'Unknown'
    }))
  });
});

// PUT /v1/constraints/:id
dashboardRouter.put('/constraints/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  if (!body.projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  // Upsert
  const existing = await db.select().from(constraints).where(eq(constraints.id, id));
  if (existing.length > 0) {
    await db.update(constraints).set({
      projectId: body.projectId,
      description: body.description,
      content: body.constraints,
      gptVariant: body.gpt_variant,
      claudeVariant: body.claude_variant,
      geminiVariant: body.gemini_variant,
      version: body.version,
    }).where(eq(constraints.id, id));
  } else {
    await db.insert(constraints).values({
      id,
      projectId: body.projectId,
      type: id,
      description: body.description,
      content: body.constraints,
      gptVariant: body.gpt_variant,
      claudeVariant: body.claude_variant,
      geminiVariant: body.gemini_variant,
      version: body.version,
    });
  }
  
  // Fire-and-forget: re-embed the constraint in the background
  // (does not block the HTTP response)
  embedConstraint(id, body.constraints ?? body.content ?? '').catch((err) =>
    console.error(`[RAG] Failed to embed constraint "${id}":`, err)
  );

  return c.json({ success: true });
});

// DELETE /v1/constraints/:id
dashboardRouter.delete('/constraints/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(constraints).where(eq(constraints.id, id));
  return c.json({ success: true });
});

// GET /v1/audit
dashboardRouter.get('/audit', async (c) => {
  const teamId = c.get('teamId');
  const limit = parseInt(c.req.query('limit') || '50');
  
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  const [org] = await db.select().from(organizations).where(eq(organizations.id, team.orgId));
  
  const teamSessions = await db.select().from(sessions).where(eq(sessions.teamId, teamId)).orderBy(desc(sessions.createdAt)).limit(limit);
  
  const totalInputTokens = teamSessions.reduce((acc, s) => acc + s.totalInputTokens, 0);
  const totalOutputTokens = teamSessions.reduce((acc, s) => acc + s.totalOutputTokens, 0);
  
  return c.json({
    org: org?.name ?? 'Unknown',
    total_sessions: teamSessions.length,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    developer_breakdown: [], // Simplified for now
    sessions: teamSessions.map(s => ({
      session_id: s.id,
      created_at: s.createdAt.toISOString(),
      constraint_version: '1.0',
      developer: {
        member_id: s.userId,
        email: s.userEmail || 'unknown@example.com',
        name: null,
        role: 'member',
      },
      models_used: ['auto'],
      total_messages: s.totalMessages,
      total_input_tokens: s.totalInputTokens,
      total_output_tokens: s.totalOutputTokens,
    }))
  });
});

// GET /v1/audit/me
dashboardRouter.get('/audit/me', async (c) => {
  const teamId = c.get('teamId');
  const userId = c.get('userId');
  const limit = parseInt(c.req.query('limit') || '50');
  
  const teamSessions = await db.select().from(sessions).where(eq(sessions.teamId, teamId)).orderBy(desc(sessions.createdAt)).limit(limit);
  const mySessions = teamSessions.filter(s => s.userId === userId || !userId); // fallback if userId missing
  
  return c.json({
    sessions: mySessions.map(s => ({
      session_id: s.id,
      created_at: s.createdAt.toISOString(),
      constraint_version: '1.0',
      developer: { member_id: s.userId, email: s.userEmail || 'unknown', name: null, role: null },
      models_used: ['auto'],
      total_messages: s.totalMessages,
      total_input_tokens: s.totalInputTokens,
      total_output_tokens: s.totalOutputTokens,
    }))
  });
});

// GET /v1/health/scores
dashboardRouter.get('/health/scores', async (c) => {
  const teamId = c.get('teamId');
  // Join through projects — constraints link to projects, not teams directly
  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map((p) => p.id);
  const teamConstraints = projectIds.length > 0
    ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds))
    : [];
  const teamSessions = await db.select().from(sessions).where(eq(sessions.teamId, teamId));
  
  // Calculate mock health scores
  return c.json({
    org: "Organization",
    scores: teamConstraints.map(c => ({
      constraint_id: c.id,
      health_score: teamSessions.length > 0 ? (teamSessions.filter(s => s.clean).length / teamSessions.length) * 100 : 100,
      override_rate: 0,
      total_requests: teamSessions.length,
      total_overrides: 0,
      status: "healthy",
      recommendation: null,
      last_computed: new Date().toISOString()
    })),
    summary: {
      total_constraints: teamConstraints.length,
      healthy: teamConstraints.length,
      warning: 0,
      critical: 0
    }
  });
});

// POST /v1/teams/github
dashboardRouter.post('/teams/github', async (c) => {
  const teamId = c.get('teamId');
  const body = await c.req.json();
  if (!body.installation_id) {
    return c.json({ error: 'installation_id is required' }, 400);
  }
  await db.update(teams).set({
    githubInstallationId: String(body.installation_id)
  }).where(eq(teams.id, teamId));
  return c.json({ success: true });
});

// GET /v1/teams/github/repos
dashboardRouter.get('/teams/github/repos', async (c) => {
  const teamId = c.get('teamId');
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  
  if (!team || !team.githubInstallationId) {
    return c.json({ repos: [] });
  }

  try {
    const octokit = await githubApp.getInstallationOctokit(Number(team.githubInstallationId));
    const res = await octokit.rest.apps.listReposAccessibleToInstallation();
    return c.json({ repos: res.data.repositories.map((r: any) => r.full_name) });
  } catch (err: any) {
    console.error("Failed to fetch repos", err);
    return c.json({ error: 'Failed to fetch repositories' }, 500);
  }
});

// GET /v1/registry
dashboardRouter.get('/registry', async (c) => {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    const data = await res.json() as any;
    const models = data.data.map((m: any) => ({
      id: m.id,
      name: m.name,
      provider: 'openrouter',
      context_window: m.context_length,
      pricing: m.pricing
    }));
    return c.json({ models, providers: ['openrouter'] });
  } catch (err) {
    return c.json({
      models: [
        { id: 'openai/gpt-4o', name: 'GPT-4o (Fallback)', provider: 'openai', context_window: 128000 },
      ],
      providers: ['openrouter']
    });
  }
});
// POST /v1/provider/models
dashboardRouter.post('/provider/models', async (c) => {
  const body = await c.req.json();
  const { baseUrl, apiKey } = body;
  
  if (!baseUrl) {
    return c.json({ error: 'baseUrl is required' }, 400);
  }

  // Prevent local/private IP SSRF
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return c.json({ error: 'Localhost endpoints are not supported.' }, 400);
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      headers: apiKey ? {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      } : {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      return c.json({ error: `Provider returned status: ${res.status}` }, 400);
    }

    const data = await res.json() as any;
    const models = data.data.map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
    }));

    return c.json({ models });
  } catch (err) {
    return c.json({ error: 'Failed to connect to the provider URL.' }, 400);
  }
});

// GET /v1/dashboard/members
dashboardRouter.get('/members', async (c) => {
  const teamId = c.get('teamId');
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return c.json({ error: 'Team not found' }, 404);

  // MOCK: Return a mock list of members for the prototype
  // In production, this would join with team_members and users tables
  return c.json({
    team: team.name,
    members: [
      {
        id: team.userId,
        email: "founder@company.com",
        name: "Founder",
        last_active: new Date().toISOString(),
        role: "owner"
      }
    ]
  });
});

// POST /v1/dashboard/members/invite
dashboardRouter.post('/members/invite', async (c) => {
  const { email, role } = await c.req.json();
  if (!email) return c.json({ error: 'Email is required' }, 400);

  // MOCK: Return a fake invite token
  const token = crypto.randomBytes(16).toString('hex');
  return c.json({
    email,
    role,
    token,
    message: 'Invite created successfully'
  });
});
