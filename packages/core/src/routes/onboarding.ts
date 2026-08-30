import { Hono } from 'hono';
import { db } from '../db';
import { apiKeys, organizations, projects, teams, users, models, sessions, tokenBudgets, constraints, githubEvaluations, teamGithubInstallations } from '../db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import crypto from 'crypto';

export const onboardingRouter = new Hono();

// GET /api/v1/onboarding/me
// Returns the current user's org/team context based on stored orch_key cookie
onboardingRouter.get('/me', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${process.env.ORCH_API_KEY || 'orch_your_server_key_here'}`) {
    return c.json({ error: 'Unauthorized Onboarding' }, 401);
  }

  const clerkId = c.req.query('clerk_id');
  if (!clerkId) return c.json({ error: 'Missing clerk_id' }, 400);

  // Check if user exists
  const [user] = await db.select().from(users).where(eq(users.id, clerkId));
  if (!user) {
    // User hasn't completed onboarding yet — signal the dashboard to redirect
    return c.json({ error: 'User not onboarded', needs_onboarding: true }, 404);
  }

  const orgIdParam = c.req.query('org_id');

  const userTeams = await db.select().from(teams).where(eq(teams.userId, user.id));

  let team: typeof teams.$inferSelect | undefined;
  if (orgIdParam) {
    team = userTeams.find((t) => t.orgId === orgIdParam);
  }

  // Fallback to the first team if none specified or not found in user's list
  if (!team && userTeams.length > 0) {
    team = userTeams[0];
  }

  // If user has no teams at all, they haven't completed onboarding
  if (!team) {
    return c.json({ error: 'No workspace found. Please complete setup.', needs_onboarding: true }, 404);
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, team.orgId));
  
  // Resolve all available organizations
  const orgsResult = userTeams.length > 0 
    ? await db.select().from(organizations).where(inArray(organizations.id, userTeams.map(t => t.orgId)))
    : [];

  const available_teams = userTeams.map((t) => {
    const tOrg = orgsResult.find((o) => o.id === t.orgId);
    return {
      team_id: t.id,
      team_name: t.name,
      org_id: t.orgId,
      org_name: tOrg?.name ?? 'Unknown',
    };
  });

  const teamInstallations = await db.select().from(teamGithubInstallations).where(eq(teamGithubInstallations.teamId, team.id));

  return c.json({
    user_id: user.id,
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
    org_id: org?.id,
    org_name: org?.name,
    team_id: team.id,
    team_name: team.name,
    github_installation_id: team.githubInstallationId, // keeping for backward compatibility if needed temporarily
    github_installations: teamInstallations.map(inst => inst.installationId),
    role: 'owner',
    available_teams,
  });
});

// POST /api/v1/onboarding/switch-org
onboardingRouter.post('/switch-org', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${process.env.ORCH_API_KEY || 'orch_your_server_key_here'}`) {
    return c.json({ error: 'Unauthorized Onboarding' }, 401);
  }

  const body = await c.req.json();
  const { clerk_id, org_id } = body;

  if (!clerk_id || !org_id) {
    return c.json({ error: 'Missing clerk_id or org_id' }, 400);
  }

  const [team] = await db.select().from(teams).where(and(eq(teams.userId, clerk_id), eq(teams.orgId, org_id))).limit(1);
  if (!team) {
    return c.json({ error: 'Organization not found or you do not have access.' }, 404);
  }

  const rawKey = `orch_${crypto.randomBytes(16).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  await db.insert(apiKeys).values({ teamId: team.id, keyHash });

  return c.json({ api_key: rawKey });
});

// POST /api/v1/onboarding/session-key
// Generates a fresh orch_ key for a signed-in user (used to restore lost cookies)
onboardingRouter.post('/session-key', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${process.env.ORCH_API_KEY || 'orch_your_server_key_here'}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { clerk_id, org_id } = await c.req.json();
  if (!clerk_id) return c.json({ error: 'Missing clerk_id' }, 400);

  // Find the user's team (prefer org_id if provided, fallback to first team)
  const userTeams = await db.select().from(teams).where(eq(teams.userId, clerk_id));
  if (userTeams.length === 0) return c.json({ error: 'No team found' }, 404);

  const team = org_id
    ? (userTeams.find((t) => t.orgId === org_id) ?? userTeams[0])
    : userTeams[0];

  const rawKey = `orch_${crypto.randomBytes(16).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  await db.insert(apiKeys).values({ teamId: team.id, keyHash });

  return c.json({ api_key: rawKey, team_id: team.id, org_id: team.orgId });
});

// POST /api/v1/onboarding/create-org
onboardingRouter.post('/create-org', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${process.env.ORCH_API_KEY || 'orch_your_server_key_here'}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { clerk_id, email, name, org_name, team_name } = body;

  if (!clerk_id || !org_name || !team_name) {
    return c.json({ error: 'Missing required fields: clerk_id, org_name, team_name' }, 400);
  }

  // 1. Ensure user exists
  let [user] = await db.select().from(users).where(eq(users.id, clerk_id));
  if (!user) {
    const parts = (name || '').split(' ');
    [user] = await db.insert(users).values({
      id: clerk_id,
      email: email || `${clerk_id}@example.com`,
      firstName: parts[0] || null,
      lastName: parts.slice(1).join(' ') || null,
    }).returning();
  }

  // 2. Create organization
  const orgId = crypto.randomUUID();
  const [org] = await db.insert(organizations).values({
    id: orgId,
    name: org_name.trim(),
  }).returning();

  // 3. Create team
  const [team] = await db.insert(teams).values({
    orgId: org.id,
    name: team_name.trim(),
    userId: user.id,
  }).returning();

  // 4. Create default project
  const [project] = await db.insert(projects).values({
    teamId: team.id,
    name: 'Main Repository',
  }).returning();

  // 5. Issue API key
  const rawKey = `orch_${crypto.randomBytes(16).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  await db.insert(apiKeys).values({ teamId: team.id, keyHash });

  return c.json({
    api_key: rawKey,
    org_id: org.id,
    org_name: org.name,
    team_id: team.id,
    team_name: team.name,
    role: 'owner'
  });
});

// POST /api/v1/onboarding/create-individual
onboardingRouter.post('/create-individual', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${process.env.ORCH_API_KEY || 'orch_your_server_key_here'}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { clerk_id, email, name, workspace_name, team_name } = body;

  if (!clerk_id || !workspace_name) {
    return c.json({ error: 'Missing required fields: clerk_id, workspace_name' }, 400);
  }

  // 1. Ensure user exists
  let [user] = await db.select().from(users).where(eq(users.id, clerk_id));
  if (!user) {
    const parts = (name || '').split(' ');
    [user] = await db.insert(users).values({
      id: clerk_id,
      email: email || `${clerk_id}@example.com`,
      firstName: parts[0] || null,
      lastName: parts.slice(1).join(' ') || null,
    }).returning();
  }

  // 2. Create personal organization
  const orgId = crypto.randomUUID();
  const [org] = await db.insert(organizations).values({
    id: orgId,
    name: workspace_name.trim(),
  }).returning();

  // 3. Create personal team
  const [team] = await db.insert(teams).values({
    orgId: org.id,
    name: (team_name || 'Personal').trim(),
    userId: user.id, // Required so session-key restoration can find this team
  }).returning();

  // 4. Create default project
  const [project] = await db.insert(projects).values({
    teamId: team.id,
    name: 'Personal Project',
  }).returning();

  // 5. Issue API key
  const rawKey = `orch_${crypto.randomBytes(16).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  await db.insert(apiKeys).values({ teamId: team.id, keyHash });

  return c.json({
    api_key: rawKey,
    org_id: org.id,
    org_name: org.name,
    team_id: team.id,
    team_name: team.name,
    role: 'owner'
  });
});

// PATCH /api/v1/onboarding/rename-org
onboardingRouter.patch('/rename-org', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${process.env.ORCH_API_KEY || 'orch_your_server_key_here'}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { org_id, name } = body;

  if (!org_id || !name?.trim()) {
    return c.json({ error: 'Missing required fields: org_id, name' }, 400);
  }

  const [org] = await db.update(organizations)
    .set({ name: name.trim() })
    .where(eq(organizations.id, org_id))
    .returning();

  if (!org) return c.json({ error: 'Org not found' }, 404);

  return c.json({ ok: true, org_id: org.id, name: org.name });
});

// PATCH /api/v1/onboarding/rename-team
onboardingRouter.patch('/rename-team', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${process.env.ORCH_API_KEY || 'orch_your_server_key_here'}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { team_id, name } = body;

  if (!team_id || !name?.trim()) {
    return c.json({ error: 'Missing required fields: team_id, name' }, 400);
  }

  const [team] = await db.update(teams)
    .set({ name: name.trim() })
    .where(eq(teams.id, team_id))
    .returning();

  if (!team) return c.json({ error: 'Team not found' }, 404);

  return c.json({ ok: true, team_id: team.id, name: team.name });
});

// DELETE /api/v1/onboarding/org
onboardingRouter.delete('/org', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${process.env.ORCH_API_KEY || 'orch_your_server_key_here'}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { org_id } = body;

  if (!org_id) {
    return c.json({ error: 'Missing required field: org_id' }, 400);
  }

  // 1. Get the team associated with the org (assuming 1 team per org for now)
  const teamList = await db.select().from(teams).where(eq(teams.orgId, org_id));
  if (teamList.length === 0) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  // Cascade delete everything for all teams under this org
  for (const team of teamList) {
    const teamId = team.id;

    // Delete Team-level children
    await db.delete(apiKeys).where(eq(apiKeys.teamId, teamId));
    await db.delete(models).where(eq(models.teamId, teamId));
    await db.delete(sessions).where(eq(sessions.teamId, teamId));
    await db.delete(tokenBudgets).where(eq(tokenBudgets.teamId, teamId));

    // For projects under this team, delete their children first
    const teamProjects = await db.select().from(projects).where(eq(projects.teamId, teamId));
    if (teamProjects.length > 0) {
      const projectIds = teamProjects.map((p) => p.id);
      await db.delete(githubEvaluations).where(inArray(githubEvaluations.projectId, projectIds));
      await db.delete(constraints).where(inArray(constraints.projectId, projectIds));
      // Delete the projects themselves
      await db.delete(projects).where(eq(projects.teamId, teamId));
    }

    // Delete the team itself
    await db.delete(teams).where(eq(teams.id, teamId));
  }

  // Finally, delete the organization
  await db.delete(organizations).where(eq(organizations.id, org_id));

  return c.json({ success: true });
});
