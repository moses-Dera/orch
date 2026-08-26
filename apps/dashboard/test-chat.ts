import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { EventSource } from 'eventsource';

global.EventSource = EventSource as any;

async function run() {
  try {
    const mcpUrl = new URL('/v1/mcp/sse', 'http://127.0.0.1:3001');
    const transport = new SSEClientTransport(mcpUrl);
    const mcpClient = new Client({ name: 'orch', version: '1.0' }, { capabilities: {} });
    await mcpClient.connect(transport);
    console.log('Connected to MCP');
  } catch (e) {
    console.error('MCP connection failed:', e);
  }
}
run();
