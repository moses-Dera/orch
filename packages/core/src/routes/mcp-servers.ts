import { Hono } from 'hono';
import { apiAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { mcpServers } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { AppVariables } from '../types';

export const mcpServersRouter = new Hono<{ Variables: AppVariables }>();

// GET /v1/mcp-servers — list the team's configured external MCP servers
mcpServersRouter.get('/mcp-servers', apiAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');
  if (!teamId) return c.json({ servers: [] });

  const servers = await db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.teamId, teamId));

  return c.json({ servers: servers.map((s) => ({ id: s.id, name: s.name, url: s.url })) });
});

// POST /v1/mcp-servers — add a new external MCP server
mcpServersRouter.post('/mcp-servers', apiAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');
  if (!teamId) return c.json({ error: 'Unauthorized' }, 401);

  const { name, url } = await c.req.json();
  if (!name?.trim() || !url?.trim()) {
    return c.json({ error: 'Missing required fields: name, url' }, 400);
  }

  const [server] = await db
    .insert(mcpServers)
    .values({ teamId, name: name.trim(), url: url.trim() })
    .returning();

  return c.json({ server: { id: server.id, name: server.name, url: server.url } }, 201);
});

// DELETE /v1/mcp-servers/:id — remove an external MCP server
mcpServersRouter.delete('/mcp-servers/:id', apiAuthMiddleware, async (c) => {
  const teamId = c.get('teamId');
  const id = c.req.param('id');
  if (!teamId) return c.json({ error: 'Unauthorized' }, 401);

  await db
    .delete(mcpServers)
    .where(eq(mcpServers.id, id));

  return c.json({ success: true });
});
