import { Hono } from 'hono';
import { db } from '../db';
import { apiKeys, constraints, constraintVersions, models, sessions, teams, organizations, tokenBudgets, projects, githubEvaluations, teamGithubInstallations } from '../db/schema';
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

import { sendEmail, getOrchEmailTemplate } from '../services/email';

// GET /v1/test-email (For Testing Gmail Setup)
dashboardRouter.get('/test-email', async (c) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'test@example.com';
    const content = `
      <p style="margin-top: 0; font-size: 16px;">Hello,</p>
      <p>Your Gmail API integration on Render is configured perfectly and your email templates are looking great.</p>
      <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #d1fae5;">
        <strong style="color: #065f46; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">🎉</span> System Online
        </strong>
      </div>
      <p style="margin-bottom: 0;">You are ready to govern your AI!</p>
    `;
    await sendEmail({
      to: adminEmail,
      subject: 'Orch: Gmail API Test Successful! 🎉',
      html: getOrchEmailTemplate('Connection Successful', content)
    });
    return c.json({ success: true, message: `Test email sent to ${adminEmail}` });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
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
  let newVersionNumber = 1;
  const contentToSave = body.constraints || body.content || '';
  if (existing.length > 0) {
    newVersionNumber = existing[0].currentVersionNumber + 1;
    await db.update(constraints).set({
      projectId: body.projectId,
      description: body.description,
      content: contentToSave,
      gptVariant: body.gpt_variant,
      claudeVariant: body.claude_variant,
      geminiVariant: body.gemini_variant,
      version: body.version,
      currentVersionNumber: newVersionNumber,
    }).where(eq(constraints.id, id));
  } else {
    await db.insert(constraints).values({
      id,
      projectId: body.projectId,
      type: id,
      description: body.description,
      content: contentToSave,
      gptVariant: body.gpt_variant,
      claudeVariant: body.claude_variant,
      geminiVariant: body.gemini_variant,
      version: body.version,
      currentVersionNumber: newVersionNumber,
    });
  }

  await db.insert(constraintVersions).values({
    constraintId: id,
    content: contentToSave,
    versionNumber: newVersionNumber,
  });
  
  // Fire-and-forget: re-embed the constraint in the background
  // (does not block the HTTP response)
  embedConstraint(id, body.constraints ?? body.content ?? '').catch((err) =>
    console.error(`[RAG] Failed to embed constraint "${id}":`, err)
  );

  return c.json({ success: true });
});

// DELETE /v1/constraints/:id
dashboardRouter.delete('/constraints/:id', async (c) => {
  const teamId = c.get('teamId');
  const id = c.req.param('id');
  
  // Verify ownership through the project chain before deleting
  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map((p) => p.id);
  
  if (projectIds.length === 0) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  await db.delete(constraints).where(
    and(eq(constraints.id, id), inArray(constraints.projectId, projectIds))
  );
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

  // Filter by userId in the DB query — never pull all sessions and filter in memory
  // (Bug #12 fix: !userId fallback previously returned ALL team sessions to any caller)
  if (!userId) {
    return c.json({ sessions: [] });
  }

  const mySessions = await db.select().from(sessions)
    .where(and(eq(sessions.teamId, teamId), eq(sessions.userId, userId)))
    .orderBy(desc(sessions.createdAt))
    .limit(limit);

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
  
  const existing = await db.select().from(teamGithubInstallations).where(
    and(
      eq(teamGithubInstallations.teamId, teamId),
      eq(teamGithubInstallations.installationId, String(body.installation_id))
    )
  );
  
  if (existing.length === 0) {
    await db.insert(teamGithubInstallations).values({
      teamId,
      installationId: String(body.installation_id)
    });
  }
  
  return c.json({ success: true });
});

// GET /v1/teams/github/repos
dashboardRouter.get('/teams/github/repos', async (c) => {
  const teamId = c.get('teamId');
  
  const installations = await db.select().from(teamGithubInstallations).where(eq(teamGithubInstallations.teamId, teamId));
  
  if (installations.length === 0) {
    return c.json({ repos: [], accounts: [] });
  }

  try {
    let allRepos: any[] = [];
    let accounts: any[] = [];
    
    await Promise.all(installations.map(async (inst) => {
      try {
        const installationId = Number(inst.installationId);
        
        // Fetch installation details to get the account avatar and name
        const { data: installation } = await githubApp.octokit.rest.apps.getInstallation({
          installation_id: installationId
        });
        
        const accountName = (installation.account as any)?.login || (installation.account as any)?.name || 'GitHub Account';
        const avatarUrl = (installation.account as any)?.avatar_url || '';
        
        accounts.push({ name: accountName, avatarUrl, installationId });

        // Fetch the repos accessible to this installation
        const octokit = await githubApp.getInstallationOctokit(installationId);
        const repos = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, {
          per_page: 100
        });
        
        allRepos = [...allRepos, ...repos];
      } catch (err) {
        console.error(`Failed to fetch for installation ${inst.installationId}`, err);
      }
    }));
    
    // Sort repositories by most recently pushed
    allRepos.sort((a: any, b: any) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime());
    
    return c.json({ 
      accountName: accounts[0]?.name,
      avatarUrl: accounts[0]?.avatarUrl,
      accounts,
      repos: allRepos.map((r: any) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        private: r.private,
        pushed_at: r.pushed_at,
        language: r.language
      }))
    });
  } catch (err: any) {
    console.error("Failed to fetch repos", err);
    return c.json({ error: "Failed to fetch repositories" }, 500);
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

  // Prevent SSRF — block localhost AND all RFC 1918 / link-local / cloud-metadata ranges
  // (Bug #19 fix: old check only blocked localhost/127.0.0.1, not 10.x, 192.168.x, etc.)
  const blockedPatterns = [
    /localhost/i,
    /127\.\d+\.\d+\.\d+/,
    /10\.\d+\.\d+\.\d+/,
    /172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+/,
    /192\.168\.\d+\.\d+/,
    /169\.254\.\d+\.\d+/,  // AWS metadata
    /::1/,
    /fd[0-9a-f]{2}:/i,     // IPv6 ULA
  ];
  if (blockedPatterns.some((p) => p.test(baseUrl))) {
    return c.json({ error: 'Private or local endpoints are not supported.' }, 400);
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      headers: apiKey ? {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      } : {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(8000),
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

  // Fetch real users from the DB instead of hardcoded mock data
  // (Bug #18 fix: was returning "founder@company.com" for every user)
  const { users } = await import('../db/schema');
  let memberList: any[] = [];

  if (team.userId) {
    const [owner] = await db.select().from(users).where(eq(users.id, team.userId));
    if (owner) {
      memberList.push({
        id: owner.id,
        email: owner.email,
        name: [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email,
        last_active: new Date().toISOString(),
        role: 'owner',
      });
    }
  }

  // Fallback if user record not found yet (e.g. Clerk user not yet synced)
  if (memberList.length === 0) {
    memberList.push({
      id: team.userId || 'unknown',
      email: 'owner@team',
      name: 'Owner',
      last_active: new Date().toISOString(),
      role: 'owner',
    });
  }

  return c.json({ team: team.name, members: memberList });
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
