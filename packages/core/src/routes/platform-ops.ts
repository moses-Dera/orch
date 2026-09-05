import { Hono } from 'hono';
import { db } from '../db';
import {
  users, organizations, teams, projects, constraints,
  sessions, githubEvaluations, jobQueue, publicSkills,
  projectSkillSubscriptions
} from '../db/schema';
import { sql, eq } from 'drizzle-orm';

export const platformOpsRouter = new Hono();

// GET /v1/platform/ops
// Super Admin only endpoint for system health, infrastructure vitals, and cross-tenant telemetry
platformOpsRouter.get('/ops', async (c) => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'okonkwomoses158@gmail.com').trim().toLowerCase();
  const authHeader = c.req.header('Authorization');
  const clerkUserId = c.req.header('X-Clerk-User-Id');
  const serverSecret = process.env.ORCH_API_KEY;

  let isAuthorized = false;

  // Direct server key authorization
  if (serverSecret && authHeader === `Bearer ${serverSecret}`) {
    isAuthorized = true;
  }

  // Clerk User ID check against ADMIN_EMAIL
  if (!isAuthorized && clerkUserId) {
    const [user] = await db.select().from(users).where(eq(users.id, clerkUserId));
    if (user && user.email.trim().toLowerCase() === adminEmail) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return c.json({ error: 'Forbidden: Restricted to platform owner' }, 403);
  }

  // 1. Database Ping & Latency
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
  } catch (err: any) {
    return c.json({ error: 'Database unreachable', details: err.message }, 503);
  }
  const dbLatencyMs = Date.now() - dbStart;

  // 2. Process & Runtime Vitals
  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  // 3. Background Job Queue Metrics
  const queueStats = await db
    .select({
      status: jobQueue.status,
      count: sql<number>`count(*)::int`,
    })
    .from(jobQueue)
    .groupBy(jobQueue.status);

  const queueMap: Record<string, number> = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
  for (const row of queueStats) {
    queueMap[row.status] = Number(row.count) || 0;
  }

  // 4. Global Fleet Aggregations
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [orgCount] = await db.select({ count: sql<number>`count(*)::int` }).from(organizations);
  const [teamCount] = await db.select({ count: sql<number>`count(*)::int` }).from(teams);
  const [projectCount] = await db.select({ count: sql<number>`count(*)::int` }).from(projects);
  const [constraintCount] = await db.select({ count: sql<number>`count(*)::int` }).from(constraints);

  // 5. Global Sentinel PR Evaluations
  const [evalStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      clean: sql<number>`count(*) filter (where ${githubEvaluations.status} = 'CLEAN')::int`,
      violations: sql<number>`count(*) filter (where ${githubEvaluations.status} = 'VIOLATION')::int`,
    })
    .from(githubEvaluations);

  // 6. Global Token Telemetry Across All Tenants
  const [tokenStats] = await db
    .select({
      totalInputTokens: sql<number>`coalesce(sum(${sessions.totalInputTokens}), 0)::bigint`,
      totalOutputTokens: sql<number>`coalesce(sum(${sessions.totalOutputTokens}), 0)::bigint`,
      totalSessions: sql<number>`count(*)::int`,
    })
    .from(sessions);

  // 7. Marketplace Stats
  const [skillsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(publicSkills);
  const [subCount] = await db.select({ count: sql<number>`count(*)::int` }).from(projectSkillSubscriptions);

  // 8. Recent Organizations List (Up to 15)
  const recentOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(sql`${organizations.createdAt} desc`)
    .limit(15);

  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    admin_email: adminEmail,
    vitals: {
      uptime_seconds: uptimeSeconds,
      memory_rss_mb: Math.round(memory.rss / (1024 * 1024)),
      memory_heap_used_mb: Math.round(memory.heapUsed / (1024 * 1024)),
      memory_heap_total_mb: Math.round(memory.heapTotal / (1024 * 1024)),
      db_latency_ms: dbLatencyMs,
      node_version: process.version,
      bun_version: (process.versions as any)?.bun || 'Bun (Embedded)',
      environment: process.env.NODE_ENV || 'production',
    },
    gateway: {
      trial_provider: process.env.TRIAL_PROVIDER || 'nvidia',
      trial_model: process.env.TRIAL_MODEL || 'meta/llama-3.2-11b-vision-instruct',
      trial_api_url: process.env.TRIAL_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
      trial_configured: !!process.env.TRIAL_API_KEY,
    },
    queue: {
      queued: queueMap.queued || 0,
      processing: queueMap.processing || 0,
      completed: queueMap.completed || 0,
      failed: queueMap.failed || 0,
      total: Object.values(queueMap).reduce((a, b) => a + b, 0),
    },
    fleet: {
      total_users: Number(userCount?.count) || 0,
      total_organizations: Number(orgCount?.count) || 0,
      total_teams: Number(teamCount?.count) || 0,
      total_projects: Number(projectCount?.count) || 0,
      total_constraints: Number(constraintCount?.count) || 0,
      total_evaluations: Number(evalStats?.total) || 0,
      clean_evaluations: Number(evalStats?.clean) || 0,
      violation_evaluations: Number(evalStats?.violations) || 0,
      pass_rate_percent: evalStats?.total ? Math.round((Number(evalStats.clean) / Number(evalStats.total)) * 100) : 100,
      total_sessions: Number(tokenStats?.totalSessions) || 0,
      total_input_tokens: Number(tokenStats?.totalInputTokens) || 0,
      total_output_tokens: Number(tokenStats?.totalOutputTokens) || 0,
      marketplace_skills: Number(skillsCount?.count) || 0,
      marketplace_subscriptions: Number(subCount?.count) || 0,
    },
    organizations: recentOrgs,
  });
});
