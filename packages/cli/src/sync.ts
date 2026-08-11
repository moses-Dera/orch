import { ofetch } from 'ofetch';
import { getConfig } from './config';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function syncConstraints() {
  const config = await getConfig();
  
  if (!config.apiKey) {
    console.error('❌ You are not logged in. Run `orch login <api_key>` first.');
    process.exit(1);
  }

  // Fallback to local dev API if not specified
  const apiUrl = config.apiUrl || 'http://127.0.0.1:3001';

  console.log('🔄 Fetching constraints from Orch Control Plane...');
  
  try {
    const response = await ofetch(`${apiUrl}/v1/sync`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (response && Array.isArray(response.constraints)) {
      const cwd = process.cwd();
      const cursorRulesPath = join(cwd, '.cursorrules');

      let markdown = '# Orch Managed Constraints\n\n';
      markdown += '> This file is auto-generated and managed by Orch. Do not edit manually.\n\n';

      if (response.constraints.length === 0) {
        markdown += 'No constraints have been set yet. Visit your Orch dashboard to create your first policy.\n';
      } else {
        markdown += '## Organization Policies\n\n';
        for (const c of response.constraints) {
          markdown += `### [${c.type.toUpperCase()}] ${c.id}\n`;
          if (c.description) {
            markdown += `*${c.description}*\n\n`;
          }
          markdown += `${c.content}\n\n`;
          
          if (c.gptVariant) markdown += `**GPT Variant:**\n${c.gptVariant}\n\n`;
          if (c.claudeVariant) markdown += `**Claude Variant:**\n${c.claudeVariant}\n\n`;
          if (c.geminiVariant) markdown += `**Gemini Variant:**\n${c.geminiVariant}\n\n`;
        }
      }

      await writeFile(cursorRulesPath, markdown, 'utf-8');
      console.log(`✅ Successfully synced .cursorrules (Version: ${response.version || 'unknown'})`);
    } else {
      console.error('❌ Invalid response from Orch Control Plane. Expected a JSON object with a constraints array.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch constraints:', error.message);
    process.exit(1);
  }
}
