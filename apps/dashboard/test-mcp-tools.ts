import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { streamText, tool, jsonSchema } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { EventSource } from 'eventsource';

global.EventSource = EventSource as any;

async function main() {
  const mcpUrl = new URL('/v1/mcp/sse', 'https://orch-core.onrender.com');
  const transport = new SSEClientTransport(mcpUrl);
  const mcpClient = new Client({ name: 'test', version: '1.0' }, { capabilities: {} });
  
  await mcpClient.connect(transport);
  console.log("Connected to MCP");
  const { tools } = await mcpClient.listTools();
  console.log("Got tools:", tools.map(t => t.name));

  const aiTools: Record<string, any> = {};
  for (const mcpTool of tools) {
    aiTools[mcpTool.name] = tool({
      description: mcpTool.description,
      parameters: jsonSchema(mcpTool.inputSchema as any),
      execute: async () => 'test',
    });
  }

  const orchProxy = createOpenAI({ baseURL: 'https://orch-core.onrender.com/v1', apiKey: 'test' });
  
  try {
    const result = streamText({
      model: orchProxy.chat('gpt-4'),
      messages: [{ role: 'user', content: 'test' }],
      ...(Object.keys(aiTools).length > 0 ? { tools: aiTools } : {}),
    });
    const res = result.toUIMessageStreamResponse();
    const reader = res.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        console.log("Chunk:", new TextDecoder().decode(value));
      }
    }
  } catch(e) {
    console.error("Synchronous error:", e);
  }
}
main().catch(console.error);
