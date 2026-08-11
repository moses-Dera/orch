import { Hono } from 'hono';
import { db } from '../db';
import { apiKeys, organizations, teams, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const onboardingRouter = new Hono();

// GET /api/v1/onboarding/me
// The Dashboard calls this with ORCH_API_KEY (acting as an admin) to issue or retrieve keys for Clerk users.
onboardingRouter.get('/me', async (c) => {
  const auth = c.req.header('Authorization');
  // Simple validation for the sake of the onboarding proxy (using env var matching)
  if (auth !== `Bearer ${process.env.ORCH_API_KEY || 'orch_your_server_key_here'}`) {
    return c.json({ error: 'Unauthorized Onboarding' }, 401);
  }

  const clerkId = c.req.query('clerk_id');
  if (!clerkId) return c.json({ error: 'Missing clerk_id' }, 400);

  // 1. Ensure user exists
  let [user] = await db.select().from(users).where(eq(users.id, clerkId));
  if (!user) {
    [user] = await db.insert(users).values({
      id: clerkId,
      email: `${clerkId}@example.com`,
    }).returning();
  }

  // 2. Find their team
  // For simplicity in this demo, we just get the first team in the DB if none specified
  const [firstTeam] = await db.select().from(teams).limit(1);
  if (!firstTeam) return c.json({ error: 'No teams found. Run seed script first.' }, 500);

  // 3. Issue or retrieve API key for that team
  const rawKey = `orch_${crypto.randomBytes(16).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  await db.insert(apiKeys).values({
    teamId: firstTeam.id,
    keyHash,
  });

  return c.json({
    api_key: rawKey,
    team_id: firstTeam.id,
  });
});
