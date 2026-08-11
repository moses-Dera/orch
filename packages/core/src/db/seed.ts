import { db } from './index';
import { organizations, teams, apiKeys, tokenBudgets, constraints } from './schema';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

async function seed() {
  console.log('🌱 Seeding database...');

  await db.execute(sql`TRUNCATE TABLE sessions, models, token_budgets, constraints, api_keys, teams, organizations, users CASCADE;`);

  // 1. Organization
  const [org] = await db.insert(organizations).values({
    id: 'org_test123',
    name: 'Acme Corp',
  }).returning();

  // 2. Team
  const [team] = await db.insert(teams).values({
    orgId: org.id,
    name: 'Engineering',
  }).returning();

  // 3. API Key (We hash "orch_test_key")
  const rawKey = 'orch_test_key';
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  await db.insert(apiKeys).values({
    keyHash,
    teamId: team.id,
  });

  // 4. Token Budget
  await db.insert(tokenBudgets).values({
    teamId: team.id,
    allocatedTokens: 500000, // Generous test budget
    consumedTokens: 150,     // Slight usage
  });

  // 5. Constraints
  await db.insert(constraints).values([
    {
      id: 'backend',
      teamId: team.id,
      type: 'tech_stack',
      description: 'Backend constraints',
      content: 'Do not use raw SQL. Use Drizzle ORM.',
    },
    {
      id: 'cyber',
      teamId: team.id,
      type: 'security',
      description: 'Cyber security policies',
      content: 'No console.logs in production code.',
    },
    {
      id: 'general',
      teamId: team.id,
      type: 'style',
      description: 'General styling guidelines',
      content: 'Always use strict TypeScript types.',
    }
  ]);

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
