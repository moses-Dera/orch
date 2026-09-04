import { Hono } from 'hono';
import { cliAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, constraintVersions, projects } from '../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

export const syncRouter = new Hono<{ Variables: { teamId: string } }>();

syncRouter.get('/sync', cliAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');

  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map(p => p.id);

  const teamConstraints = projectIds.length > 0
    ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds)).orderBy(desc(constraints.createdAt))
    : [];

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
  let newVersionNumber = 1;
  if (existing.length > 0) {
    newVersionNumber = existing[0].currentVersionNumber + 1;
    await db.update(constraints).set({
      projectId,
      description,
      content,
      currentVersionNumber: newVersionNumber,
    }).where(eq(constraints.id, id));
  } else {
    await db.insert(constraints).values({
      id,
      projectId,
      type: id,
      description,
      content,
      version: '1.0',
      currentVersionNumber: newVersionNumber,
    });
  }

  await db.insert(constraintVersions).values({
    constraintId: id,
    content,
    versionNumber: newVersionNumber,
  });
  
  // Re-embed
  embedConstraint(id, content).catch((err) =>
    console.error(`[RAG] Failed to embed constraint "${id}":`, err)
  );

  return c.json({ success: true });
});
