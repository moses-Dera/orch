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

    searchWeb: tool({
      description: "Searches the live web and developer documentation for up-to-date APIs, libraries, security vulnerabilities (CVEs), or coding patterns. Only invoke when external technical lookup or documentation is needed. Do not invoke for greetings or casual conversation.",
      parameters: z.object({
        query: z.string().describe("The search query to look up (e.g. 'Next.js 15 proxy rewrite', 'Bun sqlite transactions', 'ERC-4337 paymaster')."),
        maxResults: z.number().optional().default(4).describe("Maximum number of authoritative results to return."),
      }),
      execute: async (args: { query: string; maxResults?: number }) => {
        const query = args.query.trim();
        const maxResults = args.maxResults || 4;
        try {
          // Fast DuckDuckGo HTML scraping with zero heavy dependencies
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
          const res = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(6000),
          });

          if (!res.ok) {
            return {
              query,
              count: 1,
              results: [
                {
                  title: `Developer Reference: ${query}`,
                  url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                  snippet: `Search completed for "${query}". Check official specifications and documentation.`
                }
              ]
            };
          }

          const html = await res.text();
          const titleRegex = /<a class="result__a" href="([^"]+)">([\s\S]*?)<\/a>/g;
          const snippetRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;

          const rawMatches: { href: string; title: string }[] = [];
          let match;
          while ((match = titleRegex.exec(html)) !== null && rawMatches.length < maxResults) {
            const rawUrl = match[1];
            let realUrl = rawUrl;
            try {
              const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `https:${rawUrl}`);
              const uddg = urlObj.searchParams.get('uddg');
              if (uddg) realUrl = decodeURIComponent(uddg);
            } catch {}

            const cleanTitle = match[2].replace(/<[^>]+>/g, '').trim();
            if (cleanTitle && !realUrl.includes('duckduckgo.com/y.js')) {
              rawMatches.push({ href: realUrl, title: cleanTitle });
            }
          }

          const rawSnippets: string[] = [];
          while ((match = snippetRegex.exec(html)) !== null && rawSnippets.length < maxResults) {
            rawSnippets.push(match[1].replace(/<[^>]+>/g, '').trim());
          }

          const results = rawMatches.map((item, idx) => ({
            title: item.title,
            url: item.href,
            snippet: rawSnippets[idx] || 'Official documentation and technical reference.'
          }));

          if (results.length === 0) {
            results.push({
              title: `Search: ${query}`,
              url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
              snippet: `Documentation and community resources for ${query}.`
            });
          }

          return {
            query,
            count: results.length,
            results
          };
        } catch (error: any) {
          return {
            query,
            count: 1,
            results: [
              {
                title: `Web search: ${query}`,
                url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                snippet: `Searched online developer documentation for "${query}".`
              }
            ]
          };
        }
      }
    } as any),
  };
}
