import { Hono } from 'hono';
import { cliAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

export const syncRouter = new Hono();

syncRouter.get('/sync', cliAuthMiddleware, async (c) => {
  const teamId = c.get('teamId') as string;

  const teamConstraints = await db.select()
    .from(constraints)
    .where(eq(constraints.teamId, teamId))
    .orderBy(desc(constraints.createdAt));

  if (teamConstraints.length === 0) {
    return c.json({
      version: 0,
      constraints: [],
      updatedAt: new Date().toISOString(),
    });
  }

  return c.json({
    version: teamConstraints.length,
    constraints: teamConstraints.map(c => ({
      id: c.id,
      type: c.type,
      content: c.content,
      description: c.description,
      gptVariant: c.gptVariant,
      claudeVariant: c.claudeVariant,
      geminiVariant: c.geminiVariant,
    })),
    updatedAt: teamConstraints[0].createdAt,
  });
});
