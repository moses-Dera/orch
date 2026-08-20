import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const orchProxy = createOpenAI({
  baseURL: `${process.env.ORCH_API_URL || 'http://127.0.0.1:3001'}/v1`,
  apiKey: process.env.ORCH_API_KEY || 'orch_dummy',
});

export const maxDuration = 30; // Allow up to 30 seconds for SSE connection + generation

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Connect to the backend MCP Server via SSE
  const mcpUrl = new URL('/v1/mcp/sse', process.env.ORCH_API_URL || 'http://127.0.0.1:3001');
  const transport = new SSEClientTransport(mcpUrl);
  const mcpClient = new Client(
    { name: 'orch-dashboard-chat', version: '1.0.0' },
    { capabilities: {} }
  );

  await mcpClient.connect(transport);

  // Fetch available tools from the MCP server
  const { tools: mcpTools } = await mcpClient.listTools();

  // Convert MCP tools to Vercel AI SDK tools
  const aiTools: Record<string, any> = {};
  for (const mcpTool of mcpTools) {
    aiTools[mcpTool.name] = {
      description: mcpTool.description,
      parameters: (mcpTool.inputSchema as any),
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
    };
  }

  const result = streamText({
    model: orchProxy('anthropic/claude-3.5-sonnet'), // Using OpenRouter via our proxy
    messages,
    tools: aiTools,
    maxSteps: 5, // Allows the AI to use tools and then respond in a loop
    system: `You are the Orchestrator CTO AI Assistant. 
You help technical leaders design architectures, enforce constraints, and review rules.
You have access to MCP tools to fetch the company's active constraints and draft new ones.
Always use the tools provided when the user asks about constraints or wants to create new rules.`,
    onFinish: async () => {
      // Clean up the MCP connection when the generation finishes
      await transport.close();
    }
  });

  return result.toDataStreamResponse();
}
