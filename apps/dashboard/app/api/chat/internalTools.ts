import { tool } from 'ai';
import { z } from 'zod';

const BACKEND_URL = process.env.ORCH_API_URL || 'http://127.0.0.1:3001';

/**
 * Creates the internal tools bound to the user's API key (session key) and Team ID.
 * @param apiKey - The user's active session API key to authenticate with the backend
 */
export function getInternalTools(apiKey: string) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  return {
    createProject: tool({
      description: "Creates a new project within the user's Orchestrator team workspace. Use this when the user asks to create a new project, setup a new service, or initialize a workspace for a specific app.",
      parameters: z.object({
        name: z.string().describe("The name of the project (e.g. 'Backend API', 'Mobile App')"),
        githubRepoFullName: z.string().optional().describe("The full name of the GitHub repository (e.g. 'owner/repo'). Optional."),
      }),
      execute: async (args: { name: string; githubRepoFullName?: string }) => {
        try {
          const res = await fetch(`${BACKEND_URL}/v1/projects`, {
            method: 'POST',
            headers,
            body: JSON.stringify(args),
          });
          if (!res.ok) {
            const err = await res.text();
            return { success: false, error: `Failed to create project: ${err}` };
          }
          return { success: true, message: `Project '${args.name}' created successfully.` };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    } as any),

    listProjects: tool({
      description: "Lists all existing projects in the user's Orchestrator team workspace. Use this when you need to find a projectId to attach a constraint to, or when the user asks what projects they have.",
      parameters: z.object({}),
      execute: async (_args: Record<string, never>) => {
        try {
          const res = await fetch(`${BACKEND_URL}/v1/projects`, {
            method: 'GET',
            headers,
          });
          if (!res.ok) {
            const err = await res.text();
            return { success: false, error: `Failed to list projects: ${err}` };
          }
          const data = await res.json();
          return { success: true, projects: data.projects };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    } as any),

    createConstraint: tool({
      description: "Creates or updates a policy constraint for a specific project. Use this when the user wants to add a new rule, guideline, or constraint (e.g., 'strict typescript', 'no plaintext secrets', 'use tailwind'). You MUST provide a projectId, which you can get by calling listProjects first if you don't know it.",
      parameters: z.object({
        projectId: z.string().uuid().describe("The UUID of the project this constraint belongs to."),
        id: z.string().describe("A short, URL-friendly unique identifier for the constraint (e.g. 'strict-typescript', 'frontend-react')."),
        description: z.string().describe("A short human-readable description of what the constraint enforces."),
        constraints: z.string().describe("The actual markdown/text content of the constraint rules."),
        version: z.string().optional().default("1.0").describe("The version of the constraint."),
      }),
      execute: async (args: { projectId: string; id: string; description: string; constraints: string; version?: string }) => {
        try {
          const res = await fetch(`${BACKEND_URL}/v1/constraints/${encodeURIComponent(args.id)}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(args),
          });
          if (!res.ok) {
            const err = await res.text();
            return { success: false, error: `Failed to create constraint: ${err}` };
          }
          return { success: true, message: `Constraint '${args.id}' created successfully.` };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    } as any),

    deleteConstraint: tool({
      description: "Deletes a specific policy constraint from the workspace. Use this when the user asks to remove, delete, or audit and clear old constraints.",
      parameters: z.object({
        id: z.string().describe("The unique ID of the constraint to delete."),
      }),
      execute: async (args: { id: string }) => {
        try {
          const res = await fetch(`${BACKEND_URL}/v1/constraints/${encodeURIComponent(args.id)}`, {
            method: 'DELETE',
            headers,
          });
          if (!res.ok) {
            const err = await res.text();
            return { success: false, error: `Failed to delete constraint: ${err}` };
          }
          return { success: true, message: `Constraint '${args.id}' deleted successfully.` };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    } as any),
  };
}
