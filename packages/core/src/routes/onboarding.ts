import { Hono } from 'hono';
import { db } from '../db';
import { apiKeys, organizations, projects, teams, users } from '../db/schema';
import { eq } from 'drizzle-orm';
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

  let team: typeof teams.$inferSelect | undefined;
  if (orgIdParam) {
    const [t] = await db.select().from(teams).where(eq(teams.orgId, orgIdParam)).limit(1);
    team = t;
  }

  if (!team) {
    const [firstTeam] = await db.select().from(teams).limit(1);
    team = firstTeam;
  }

  if (!team) {
    return c.json({ error: 'No workspace found. Please complete setup.', needs_onboarding: true }, 404);
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, team.orgId));

  return c.json({
    user_id: user.id,
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
    org_id: org?.id,
    org_name: org?.name,
    team_id: team.id,
    team_name: team.name,
    role: 'owner',
  });
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
