import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool, jsonSchema, convertToModelMessages } from 'ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { EventSource } from 'eventsource';

// @ts-ignore - Polyfill EventSource for Node.js runtime so the MCP SDK doesn't crash
global.EventSource = EventSource as any;
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.ORCH_API_URL || 'http://127.0.0.1:3001';
const ORCH_API_KEY = process.env.ORCH_API_KEY ?? '';

export async function POST(req: Request) {
  const { messages, model } = await req.json();
  const jar = await cookies();
  let apiKey = jar.get("orch_key")?.value ?? '';

  // Auto-restore: if no cookie, generate a fresh session key for the signed-in user
  if (!apiKey) {
    const { userId } = await auth();
    if (userId) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/onboarding/session-key`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${ORCH_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ clerk_id: userId }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          apiKey = data.api_key ?? '';
          if (apiKey) {
            jar.set('orch_key', apiKey, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 60 * 60 * 24 * 30,
            });
          }
        }
      } catch {
        // Session restore failed — fall back to trial mode
      }
    }
    if (!apiKey) apiKey = 'orch_dummy';
  }

  // Pure proxy — the backend handles RAG, constraints, model selection, trial/BYOK
  const orchProxy = createOpenAI({
    baseURL: `${BACKEND_URL}/v1`,
    apiKey,
  });

  // Fetch the team's configured external MCP servers from the backend
  // This is a fast DB read — no hanging SSE connections
  let mcpTools: any[] = [];
  const mcpClients: { client: Client; transport: SSEClientTransport }[] = [];

  try {
    const serversRes = await fetch(`${BACKEND_URL}/v1/mcp-servers`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000), // 3s max to fetch server list
    });

    if (serversRes.ok) {
      const { servers } = await serversRes.json() as { servers: { id: string; name: string; url: string }[] };

      // Connect to each configured external MCP server in parallel with a timeout
      const connections = await Promise.allSettled(
        servers.map(async (server) => {
          const transport = new SSEClientTransport(new URL(server.url));
          const client = new Client(
            { name: `orch-dashboard-${server.name}`, version: '1.0.0' },
            { capabilities: {} }
          );
          try {
            await Promise.race([
              client.connect(transport),
              new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${server.name}`)), 5000))
            ]);
            const { tools } = await client.listTools();
            return { client, transport, tools, serverName: server.name };
          } catch (error) {
            transport.close().catch(() => {});
            throw error;
          }
        })
      );

      for (const result of connections) {
        if (result.status === 'fulfilled') {
          mcpClients.push({ client: result.value.client, transport: result.value.transport });
          mcpTools.push(...result.value.tools);
        } else {
          console.warn('[MCP] Could not connect to external server:', result.reason?.message);
        }
      }
    }
  } catch (err: any) {
    console.warn('[MCP] Failed to fetch server list:', err.message);
  }

  // Convert tools to Vercel AI SDK format
  const aiTools: Record<string, any> = {};
  for (const mcpTool of mcpTools) {
    aiTools[mcpTool.name] = tool({
      description: mcpTool.description,
      parameters: jsonSchema(mcpTool.inputSchema as any),
      execute: async (args: any) => {
        // Try each client until one succeeds (tools are namespaced per server)
        for (const { client } of mcpClients) {
          try {
            return await client.callTool({ name: mcpTool.name, arguments: args });
          } catch {}
        }
        return { error: 'Tool execution failed' };
      },
    } as any);
  }

  // The backend overrides model in trial mode — just pass a sensible default
  const chatModel = model || process.env.ORCH_DEFAULT_MODEL || 'gpt-4o-mini';
  const hasTools = Object.keys(aiTools).length > 0;

  const result = streamText({
    model: orchProxy.chat(chatModel),
    messages: await convertToModelMessages(messages),
    ...(hasTools ? { tools: aiTools } : {}),
    system: `You are the Orchestrator CTO AI Assistant.
You help technical leaders design architectures, enforce constraints, and review rules.
Your context (projects, constraints, team rules) is automatically provided by the Orch backend.
${hasTools ? `You have access to ${Object.keys(aiTools).length} external tool(s) from your team's MCP servers. Use them when relevant.` : ''}`,
    onFinish: async () => {
      // Close all MCP connections
      await Promise.allSettled(mcpClients.map(({ transport }) => transport.close()));
    }
  });

  return result.toDataStreamResponse();
}
