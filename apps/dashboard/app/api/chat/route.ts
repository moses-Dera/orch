import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool, jsonSchema } from 'ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { cookies } from 'next/headers';
import { EventSource } from 'eventsource';

// @ts-ignore - Polyfill EventSource for Node.js runtime so the MCP SDK doesn't crash
global.EventSource = EventSource as any;
export const maxDuration = 30; // Allow up to 30 seconds for SSE connection + generation

export async function POST(req: Request) {
  const { messages } = await req.json();
  const jar = await cookies();
  const apiKey = jar.get("orch_key")?.value || process.env.ORCH_API_KEY || 'orch_dummy';

  const orchProxy = createOpenAI({
    baseURL: `${process.env.ORCH_API_URL || 'http://127.0.0.1:3001'}/v1`,
    apiKey,
  });

  // Try to connect to the backend MCP Server — degrade gracefully if unavailable
  const mcpUrl = new URL('/v1/mcp/sse', process.env.ORCH_API_URL || 'http://127.0.0.1:3001');
  const transport = new SSEClientTransport(mcpUrl);
  const mcpClient = new Client(
    { name: 'orch-dashboard-chat', version: '1.0.0' },
    { capabilities: {} }
  );

  let mcpTools: any[] = [];
  let mcpConnected = false;
  try {
    await mcpClient.connect(transport);
    const { tools } = await mcpClient.listTools();
    mcpTools = tools;
    mcpConnected = true;
  } catch (error: any) {
    // MCP is optional — chat still works without it, just without tool access
    console.warn("MCP Connection failed, continuing without tools:", error?.message || error);
  }

  // Convert MCP tools to Vercel AI SDK tools using the `tool` wrapper
  const aiTools: Record<string, any> = {};
  for (const mcpTool of mcpTools) {
    aiTools[mcpTool.name] = tool({
      description: mcpTool.description,
      parameters: jsonSchema(mcpTool.inputSchema as any),
      execute: async (args: any) => {
        try {
          const result = await mcpClient.callTool({
            name: mcpTool.name,
            arguments: args,
          });
          return result;
        } catch (error: any) {
          return { error: error.message };
        }
      },
    } as any);
  }

  const chatModel = process.env.ORCH_DEFAULT_MODEL || 'ollama/llama3';

  const result = streamText({
    model: orchProxy.chat(chatModel), // Allow environment to specify the backend AI model
    messages,
    ...(Object.keys(aiTools).length > 0 ? { tools: aiTools } : {}),
    system: `You are the Orchestrator CTO AI Assistant. 
You help technical leaders design architectures, enforce constraints, and review rules.
${mcpConnected ? 'You have access to MCP tools to fetch the company\'s active constraints and draft new ones. Always use the tools provided when the user asks about constraints or wants to create new rules.' : ''}`,
    onFinish: async () => {
      if (mcpConnected) {
        try { await transport.close(); } catch {}
      }
    }
  });

  return result.toUIMessageStreamResponse();
}
