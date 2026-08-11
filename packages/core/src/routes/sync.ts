import { Hono } from 'hono';
import { cliAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, projects } from '../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

export const syncRouter = new Hono<{ Variables: { teamId: string } }>();

syncRouter.get('/sync', cliAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');

  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map(p => p.id);

  let teamConstraints: any[] = [];
  if (projectIds.length > 0) {
    teamConstraints = await db.select()
      .from(constraints)
      .where(inArray(constraints.projectId, projectIds))
      .orderBy(desc(constraints.createdAt));
  }

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
