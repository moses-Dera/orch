const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBEDDING_MODEL = 'models/gemini-embedding-001';

const TOOLS = [
  {
    name: 'createProject',
    description: "Creates a new project within the user's Orchestrator team workspace. Use this when the user asks to create a new project, setup a new service, or initialize a workspace for a specific app."
  },
  {
    name: 'listProjects',
    description: "Lists all existing projects in the user's Orchestrator team workspace. Use this when you need to find a projectId to attach a constraint to, or when the user asks what projects they have."
  },
  {
    name: 'createConstraint',
    description: "Creates or updates a policy constraint for a specific project. Use this when the user wants to add a new rule, guideline, or constraint (e.g., 'strict typescript', 'no plaintext secrets', 'use tailwind'). You MUST provide a projectId, which you can get by calling listProjects first if you don't know it."
  },
  {
    name: 'deleteConstraint',
    description: "Deletes a specific policy constraint from the workspace. Use this when the user asks to remove, delete, or audit and clear old constraints."
  }
];

async function embedText(text) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required to generate embeddings.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GEMINI_EMBEDDING_MODEL,
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini Embedding API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.embedding.values;
}

async function main() {
  console.log('Generating embeddings for internal tools...');
  
  const results = [];
  for (const tool of TOOLS) {
    console.log(`Embedding tool: ${tool.name}...`);
    const embedding = await embedText(tool.description);
    results.push({
      name: tool.name,
      description: tool.description,
      embedding
    });
  }

  const outputContent = `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Run \`node scripts/generate-tool-embeddings.js\` to regenerate.

export const TOOL_EMBEDDINGS = ${JSON.stringify(results, null, 2)};
`;

  const outputPath = path.join(__dirname, '..', 'app', 'api', 'chat', 'toolEmbeddings.ts');
  fs.writeFileSync(outputPath, outputContent, 'utf-8');
  console.log(`Successfully wrote embeddings to ${outputPath}`);
}

main().catch(console.error);
