import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from './config';
import { ofetch } from 'ofetch';

export async function runMcpServer() {
  const config = await getConfig();

  if (!config.apiKey) {
    console.error('❌ You are not logged in. Run `orch login <api_key>` first.');
    process.exit(1);
  }

  const apiUrl = config.apiUrl || 'http://127.0.0.1:3001';

  const server = new Server(
    { name: 'orch-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'fetch_policy',
          description: 'Retrieves the active coding constraints and policies for the current workspace.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'add_constraint',
          description: 'Adds a new constraint dynamically to the organization. Use this when you learn a new architectural rule that should be enforced across the repository.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'A unique short identifier for the constraint (e.g. "no_raw_sql")' },
              type: { type: 'string', description: 'The category of the constraint (e.g. "tech_stack", "security", "style", "testing")' },
              description: { type: 'string', description: 'A brief 1-sentence description.' },
              content: { type: 'string', description: 'The full explanation of the constraint or rule.' },
            },
            required: ['id', 'type', 'content'],
          },
        },
        {
          name: 'evaluate_code',
          description: 'Evaluates a code diff against the organizational constraints before committing.',
          inputSchema: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'The name of the file being changed' },
              diff: { type: 'string', description: 'The git diff or code block to evaluate' },
            },
            required: ['filename', 'diff'],
          },
        },
        {
          name: 'evaluate_plan',
          description: 'Evaluates an architectural plan against the organizational constraints before generating code.',
          inputSchema: {
            type: 'object',
            properties: {
              plan_description: { type: 'string', description: 'The architectural plan or specification to evaluate' },
              project_id: { type: 'string', description: 'Optional project ID to filter constraints' },
            },
            required: ['plan_description'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      if (request.params.name === 'fetch_policy') {
        const response = await ofetch(`${apiUrl}/v1/sync`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });

        if (response && Array.isArray(response.constraints)) {
          let text = '# Orch Active Constraints\n\n';
          if (response.constraints.length === 0) text += 'No constraints found.';
          for (const c of response.constraints) {
            text += `[${c.type.toUpperCase()}] ${c.id}: ${c.content}\n`;
            if (c.gptVariant) text += `  GPT Variant: ${c.gptVariant}\n`;
            if (c.claudeVariant) text += `  Claude Variant: ${c.claudeVariant}\n`;
          }
          return {
            content: [{ type: 'text', text }],
          };
        }
        
        return {
          content: [{ type: 'text', text: 'No policy found or invalid response.' }],
        };
      }

      if (request.params.name === 'add_constraint') {
        const { id, type, content, description } = request.params.arguments as any;

        try {
          await ofetch(`${apiUrl}/v1/constraints/${id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${config.apiKey}` },
            body: { description, constraints: content },
          });
          return {
            content: [{ type: 'text', text: `✅ Successfully added constraint [${type}] ${id}` }],
          };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `❌ Failed to add constraint: ${error.message}` }],
            isError: true,
          };
        }
      }

      if (request.params.name === 'evaluate_code') {
        const { filename, diff } = request.params.arguments as any;

        const response = await ofetch(`${apiUrl}/v1/review`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.apiKey}` },
          body: { filename, diff, domain: 'auto', model: 'auto' },
        });

        return {
          content: [
            {
              type: 'text',
              text: `Review Result: ${response.clean ? 'CLEAN' : 'VIOLATIONS FOUND'}\n\nSummary: ${response.summary}\n\nIssues:\n${JSON.stringify(response.issues, null, 2)}`,
            },
          ],
        };
      }

      if (request.params.name === 'evaluate_plan') {
        const { plan_description, project_id } = request.params.arguments as any;

        const response = await ofetch(`${apiUrl}/v1/evaluate-plan`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.apiKey}` },
          body: { plan_description, project_id },
        });

        return {
          content: [
            {
              type: 'text',
              text: `Plan Evaluation Result: ${response.clean ? 'CLEAN' : 'VIOLATIONS FOUND'}\n\nSummary: ${response.summary}\n\nViolations:\n${JSON.stringify(response.violations, null, 2)}`,
            },
          ],
        };
      }

      throw new Error(`Tool not found: ${request.params.name}`);
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error executing tool: ${error.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Send a log message via stderr so it doesn't break stdout protocol
  console.error('🚀 Orch MCP Server is running and listening on stdio');
}
