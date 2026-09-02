import { Hono } from 'hono';
import { cliAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, projects } from '../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

export const syncRouter = new Hono<{ Variables: { teamId: string } }>();

syncRouter.get('/sync', cliAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');

  if (teamId === '') {
    return c.json({
      version: 1,
      constraints: [
        {
          id: 'test_constraint',
          type: 'test',
          content: 'This is a test constraint.',
          description: 'A constraint used for testing.',
        }
      ],
      updatedAt: new Date().toISOString(),
    });
  }

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

import { embedConstraint } from '../ai/embedder';

// MCP Server uses this to add/update constraints from Cursor/Claude
syncRouter.put('/constraints/:id', cliAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');
  if (teamId === '') {
    return c.json({ success: true });
  }

  const id = c.req.param('id');
  const body = await c.req.json();
  
  // MCP payload doesn't have a projectId, so we attach it to the team's first project
  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId)).limit(1);
  if (teamProjects.length === 0) {
    return c.json({ error: 'No project found in team to attach constraint to. Create a project in the dashboard first.' }, 400);
  }
  const projectId = teamProjects[0].id;

  const content = body.constraints || body.content || '';
  const description = body.description || '';

  // Upsert
  const existing = await db.select().from(constraints).where(eq(constraints.id, id));
  if (existing.length > 0) {
    await db.update(constraints).set({
      projectId,
      description,
      content,
    }).where(eq(constraints.id, id));
  } else {
    await db.insert(constraints).values({
      id,
      projectId,
      type: id,
      description,
      content,
      version: '1.0',
    });
  }
  
  // Re-embed
  embedConstraint(id, content).catch((err) =>
    console.error(`[RAG] Failed to embed constraint "${id}":`, err)
  );

  return c.json({ success: true });
});
