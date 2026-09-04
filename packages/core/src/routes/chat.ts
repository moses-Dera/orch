import { Hono } from 'hono';
import { db } from '../db';
import { sessions, chatMessages } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { apiAuthMiddleware } from '../middlewares';
import type { AppVariables } from '../types';

export const chatRouter = new Hono<{ Variables: AppVariables }>();

// All routes require auth
chatRouter.use('*', apiAuthMiddleware);

// GET /v1/chat/sessions
chatRouter.get('/sessions', async (c) => {
  const teamId = c.get('teamId');
  const userId = c.get('userId');

  const query = userId 
    ? and(eq(sessions.teamId, teamId), eq(sessions.userId, userId))
    : eq(sessions.teamId, teamId);

  const teamSessions = await db.select()
    .from(sessions)
    .where(query)
    .orderBy(desc(sessions.createdAt));

  return c.json({ sessions: teamSessions });
});

// GET /v1/chat/sessions/:id
chatRouter.get('/sessions/:id', async (c) => {
  const teamId = c.get('teamId');
  const sessionId = c.req.param('id');

  const [session] = await db.select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.teamId, teamId)));

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ session });
});

// GET /v1/chat/sessions/:id/messages
chatRouter.get('/sessions/:id/messages', async (c) => {
  const teamId = c.get('teamId');
  const sessionId = c.req.param('id');

  if (!teamId) {
    return c.json({ messages: [] });
  }

  // Verify ownership
  const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.teamId, teamId)));
  if (!session) {
    // New/unpersisted session: return empty array cleanly instead of 404
    return c.json({ messages: [] });
  }

  const messages = await db.select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);

  return c.json({ messages });
});

// POST /v1/chat/sessions/:id/messages
chatRouter.post('/sessions/:id/messages', async (c) => {
  const teamId = c.get('teamId');
  const sessionId = c.req.param('id');
  const body = await c.req.json();
  const { role, content, tool_calls } = body;

  // Verify or create ownership
  let [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.teamId, teamId)));
  
  if (!session) {
    // Check if the UUID is valid, else generate one
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const validId = uuidRegex.test(sessionId) ? sessionId : undefined;
    
    const [newSession] = await db.insert(sessions).values({
      id: validId,
      teamId,
      userId: c.get('userId'),
      clean: true,
      totalMessages: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    }).returning();
    session = newSession;
  }

  const [message] = await db.insert(chatMessages).values({
    sessionId: session.id,
    role,
    content,
    toolCalls: tool_calls || null
  }).returning();

  return c.json({ message });
});
