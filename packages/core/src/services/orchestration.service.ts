import { db } from '../db';
import { constraints, projects } from '../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { retrieveChunks } from '../ai/retriever';

interface OrchestrationOptions {
  teamId: string;
  projectId?: string;
  userPrompt?: string;
  inboundMessages?: any[];
  apiKey: string | null;
  endpoint: string;
  model: string;
  stream?: boolean;
}

export class OrchestrationService {
  /**
   * Generates a response from the LLM based on user constraints and input.
   * Returns a standard Response object (useful for proxying streams).
   */
  static async generate(options: OrchestrationOptions): Promise<Response> {
    const { teamId, projectId, apiKey, endpoint, model, stream = false } = options;
    
    let userPrompt = options.userPrompt;
    let inboundMessages = options.inboundMessages || [];

    if (!userPrompt && inboundMessages.length > 0) {
      const lastMessage = inboundMessages[inboundMessages.length - 1];
      if (lastMessage.role === 'user') {
        userPrompt = lastMessage.content;
      }
    }

    // 1. Fetch Constraints
    let projectIds: string[] = [];
    if (projectId) {
      projectIds = [projectId];
    } else {
      const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
      projectIds = teamProjects.map((p) => p.id);
    }
    
    const teamConstraints = projectIds.length > 0
      ? await db.select({ id: constraints.id, content: constraints.content }).from(constraints).where(inArray(constraints.projectId, projectIds)).orderBy(desc(constraints.createdAt))
      : [];

    const constraintIds = teamConstraints.map((c) => c.id);
    let systemConstraints = teamConstraints.map((c) => `- ${c.content}`).join('\n');

    // 2. RAG Retrieval
    if (constraintIds.length > 0 && userPrompt) {
      try {
        const chunks = await retrieveChunks(userPrompt, constraintIds);
        if (chunks.length > 0) {
          systemConstraints = chunks.map((chunk) => `- ${chunk.chunkText}`).join('\n');
        }
      } catch (ragErr) {
        console.warn('[RAG] Retrieval failed:', ragErr);
      }
    }

    // 3. Build Messages
    let messages = [];
    if (inboundMessages.length > 0) {
      if (inboundMessages[0].role === 'system') {
        inboundMessages[0].content = `${systemConstraints}\n\n${inboundMessages[0].content}`;
        messages = inboundMessages;
      } else {
        messages = [{ role: 'system', content: systemConstraints }, ...inboundMessages];
      }
    } else {
      messages = [
        { role: 'system', content: systemConstraints },
        { role: 'user', content: userPrompt || '' }
      ];
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // 4. LLM API Call
    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        ...(stream ? { stream: true } : {})
      })
    });
  }
}
