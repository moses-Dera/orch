import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getMcpServer, activeTransports } from '../mcp/server';
import { HonoSSEServerTransport } from '../mcp/hono-transport';
import { randomUUID } from 'crypto';

export const mcpRouter = new Hono();

mcpRouter.get('/sse', async (c) => {
  return streamSSE(c, async (stream) => {
    const sessionId = randomUUID();
    const transport = new HonoSSEServerTransport('/v1/mcp/message', stream, sessionId);
    
    stream.onAbort(() => {
      activeTransports.delete(sessionId);
      transport.close();
    });

    activeTransports.set(sessionId, transport);
    
    const mcpServer = getMcpServer();
    await mcpServer.connect(transport);

    // Keep the stream alive to prevent closing
    while (true) {
      await stream.sleep(15000); // Wait 15 seconds before looping
      if (activeTransports.get(sessionId) === undefined) {
        break;
      }
    }
  });
});

mcpRouter.post('/message', async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return c.text('Missing sessionId', 400);
  }

  const transport = activeTransports.get(sessionId);
  if (!transport) {
    return c.text('Session not found', 404);
  }

  const body = await c.req.json();
  await transport.handlePostMessage(body);

  return c.text('Accepted', 202);
});
