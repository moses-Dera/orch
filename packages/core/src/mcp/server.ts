import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { HonoSSEServerTransport } from './hono-transport';
import { db } from '../db';
import { constraints } from '../db/schema';
import { retrieveChunks } from '../ai/retriever';
import { randomUUID } from 'crypto';

export const activeTransports = new Map<string, HonoSSEServerTransport>();

export function getMcpServer() {
  const server = new Server(
    { name: 'orch-mcp-web', version: '1.0.0' },
    { capabilities: { tools: {}, prompts: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'get_relevant_constraints',
          description: 'Retrieves relevant active coding constraints and policies for the current workspace based on a query.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The semantic query to search for relevant constraints (e.g. "React state management", "database migrations")' },
            },
            required: ['query'],
          },
        },
        {
          name: 'draft_new_constraint',
          description: 'Drafts a new constraint dynamically to the organization for CTO approval.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'A unique short identifier for the constraint (e.g. "no_raw_sql")' },
              type: { type: 'string', description: 'The category of the constraint (e.g. "tech_stack", "security", "style", "testing")' },
              description: { type: 'string', description: 'A brief 1-sentence description.' },
              content: { type: 'string', description: 'The full explanation of the constraint or rule.' },
              projectId: { type: 'string', description: 'The project ID this constraint applies to.' }
            },
            required: ['id', 'type', 'content', 'projectId'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'get_relevant_constraints') {
      const { query } = request.params.arguments as any;
      try {
        const chunks = await retrieveChunks(query);
        let text = '# Relevant Active Constraints\n\n';
        if (chunks.length === 0) {
          text += 'No relevant constraints found.';
        } else {
          chunks.forEach((chunk, index) => {
            text += `## Match ${index + 1} (Constraint ID: ${chunk.constraintId})\n`;
            text += `${chunk.chunkText}\n\n`;
          });
        }
        return { content: [{ type: 'text', text }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error retrieving constraints: ${error.message}` }], isError: true };
      }
    }
    
    if (request.params.name === 'draft_new_constraint') {
      const { id, type, content, description, projectId } = request.params.arguments as any;
      try {
        await db.insert(constraints).values({
          id,
          type,
          content,
          description: description || '',
          projectId,
          status: 'draft',
        });
        return { content: [{ type: 'text', text: `✅ Successfully drafted constraint [${type}] ${id}. It is awaiting approval.` }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `❌ Failed to draft constraint: ${error.message}` }], isError: true };
      }
    }
    
    throw new Error(`Tool not found: ${request.params.name}`);
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'architecture_planning',
          description: 'A prompt template that automatically sets up the AI for high-level technical planning against current constraints.',
        }
      ]
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (request.params.name === 'architecture_planning') {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'I am planning a new architectural feature. Please help me design it while ensuring it adheres strictly to our current project constraints. Use the `get_relevant_constraints` tool to fetch rules related to my architecture before suggesting a final design.'
            }
          }
        ]
      };
    }
    throw new Error(`Prompt not found: ${request.params.name}`);
  });

  return server;
}
