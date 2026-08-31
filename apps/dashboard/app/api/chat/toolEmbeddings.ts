export const TOOL_EMBEDDINGS = [
  {
    "name": "createProject",
    "description": "Creates a new project within the user's Orchestrator team workspace. Use this when the user asks to create a new project, setup a new service, or initialize a workspace for a specific app.",
    "embedding": new Array(768).fill(0)
  },
  {
    "name": "listProjects",
    "description": "Lists all existing projects in the user's Orchestrator team workspace. Use this when you need to find a projectId to attach a constraint to, or when the user asks what projects they have.",
    "embedding": new Array(768).fill(0)
  },
  {
    "name": "createConstraint",
    "description": "Creates or updates a policy constraint for a specific project. Use this when the user wants to add a new rule, guideline, or constraint (e.g., 'strict typescript', 'no plaintext secrets', 'use tailwind'). You MUST provide a projectId, which you can get by calling listProjects first if you don't know it.",
    "embedding": new Array(768).fill(0)
  },
  {
    "name": "deleteConstraint",
    "description": "Deletes a specific policy constraint from the workspace. Use this when the user asks to remove, delete, or audit and clear old constraints.",
    "embedding": new Array(768).fill(0)
  }
];
