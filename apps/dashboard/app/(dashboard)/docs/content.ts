export type Audience = "developer" | "admin"

export interface DocSection {
  id: string
  title: string
  audience: Audience | "both"
  content: DocBlock[]
}

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "code"; lang: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; variant: "info" | "warning" | "tip"; text: string }
  | { type: "list"; items: string[] }

export const SECTIONS: DocSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    audience: "both",
    content: [
      { type: "p", text: "Orch is a governance layer for AI. It sits between your developers and their AI models, enforcing your organization's rules on every prompt — automatically, without changing how developers work." },
      { type: "h3", text: "How it works" },
      { type: "p", text: "Every request passes through the Orch pipeline: domain detection → constraint injection → model execution → response streaming. Developers get answers. You get compliance." },
      { type: "list", items: [
        "Prompt interception and constraint enforcement",
        "Multi-tenant org, team, and member management",
        "Model policy — Enforced, Allowlist, or Open",
        "Session memory with smart context window management",
        "Streaming responses with automatic model fallback",
        "Per-developer audit log and cost attribution",
      ]},
      { type: "callout", variant: "tip", text: "Orch works with any LLM — GPT-4, Claude, Gemini, Mistral, and 60+ others via the model registry." },
    ],
  },
  {
    id: "quickstart",
    title: "Quick Start",
    audience: "developer",
    content: [
      { type: "p", text: "Get up and running in under 5 minutes." },
      { type: "h3", text: "1. Get your API key" },
      { type: "p", text: "Go to Settings in the dashboard and copy your personal API key. It looks like orch_xxxxxxxxxxxx." },
      { type: "h3", text: "2. Send your first request" },
      { type: "code", lang: "bash", text: `curl -X POST https://your-orch-instance/api/v1/orchestrate \\
  -H "Authorization: Bearer orch_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Explain async/await in Python"}],
    "stream": false
  }'` },
      { type: "h3", text: "3. Stream a response" },
      { type: "code", lang: "bash", text: `curl -X POST https://your-orch-instance/api/v1/orchestrate \\
  -H "Authorization: Bearer orch_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Write a Python class"}], "stream": true}'` },
      { type: "callout", variant: "info", text: "Streaming uses Server-Sent Events (SSE). Each chunk is a JSON object with a delta field." },
    ],
  },
  {
    id: "authentication",
    title: "Authentication",
    audience: "both",
    content: [
      { type: "p", text: "All API requests require a Bearer token in the Authorization header." },
      { type: "code", lang: "http", text: `Authorization: Bearer orch_xxxxxxxxxxxx` },
      { type: "h3", text: "Key types" },
      { type: "table", headers: ["Type", "Scope", "Where to get it"], rows: [
        ["Personal key", "Your sessions only", "Settings → API Key"],
        ["Team key", "All team sessions", "Admin creates in Team page"],
      ]},
      { type: "h3", text: "Bring your own model key" },
      { type: "p", text: "You can pass your own model API key per request. It is never stored — used only for that request." },
      { type: "code", lang: "bash", text: `curl -X POST .../api/v1/orchestrate \\
  -H "Authorization: Bearer orch_xxxxxxxxxxxx" \\
  -H "X-Model-API-Key: sk-your-openai-key" \\
  -d '{"messages": [...]}'` },
      { type: "callout", variant: "warning", text: "Never commit your API key to source control. Use environment variables." },
    ],
  },
  {
    id: "chat-api",
    title: "Chat API",
    audience: "developer",
    content: [
      { type: "p", text: "The orchestrate endpoint is the core of Orch. It accepts messages, applies your org's constraints, and returns a response from the configured model." },
      { type: "h3", text: "Endpoint" },
      { type: "code", lang: "http", text: `POST /api/v1/orchestrate` },
      { type: "h3", text: "Request body" },
      { type: "table", headers: ["Field", "Type", "Required", "Description"], rows: [
        ["messages", "array", "Yes", "Array of {role, content} objects"],
        ["stream", "boolean", "No", "Enable SSE streaming (default: false)"],
        ["session_id", "string", "No", "Continue an existing session"],
        ["model_override", "string", "No", "Override model (if policy allows)"],
      ]},
      { type: "h3", text: "Example" },
      { type: "code", lang: "python", text: `import httpx

client = httpx.Client(
    base_url="https://your-orch-instance",
    headers={"Authorization": "Bearer orch_xxxxxxxxxxxx"}
)

response = client.post("/api/v1/orchestrate", json={
    "messages": [
        {"role": "user", "content": "Review this code for security issues"}
    ],
    "stream": False
})

print(response.json()["content"])` },
      { type: "h3", text: "Streaming example" },
      { type: "code", lang: "python", text: `import httpx

with httpx.stream("POST", "https://your-orch-instance/api/v1/orchestrate",
    headers={"Authorization": "Bearer orch_xxxxxxxxxxxx"},
    json={"messages": [{"role": "user", "content": "Hello"}], "stream": True}
) as r:
    for line in r.iter_lines():
        if line.startswith("data: "):
            print(line[6:], end="", flush=True)` },
    ],
  },
  {
    id: "audit",
    title: "Code Audit",
    audience: "developer",
    content: [
      { type: "p", text: "The audit endpoint analyzes code against your org's constraint profiles and returns structured findings." },
      { type: "h3", text: "Endpoint" },
      { type: "code", lang: "http", text: `POST /api/v1/audit` },
      { type: "h3", text: "Request body" },
      { type: "table", headers: ["Field", "Type", "Required", "Description"], rows: [
        ["code", "string", "Yes", "The code to audit"],
        ["language", "string", "No", "Programming language hint"],
        ["context", "string", "No", "Additional context about the code"],
      ]},
      { type: "h3", text: "Example" },
      { type: "code", lang: "bash", text: `curl -X POST .../api/v1/audit \\
  -H "Authorization: Bearer orch_xxxxxxxxxxxx" \\
  -d '{
    "code": "SELECT * FROM users WHERE id = " + user_input,
    "language": "python"
  }'` },
      { type: "callout", variant: "tip", text: "The VS Code extension runs audit automatically on right-click → Orch: Audit File." },
    ],
  },
  {
    id: "constraints",
    title: "Constraints",
    audience: "admin",
    content: [
      { type: "p", text: "Constraints are the rules Orch enforces on every prompt. They are injected as system instructions before the model sees the user's message." },
      { type: "h3", text: "Constraint profiles" },
      { type: "p", text: "Each constraint profile targets a domain (e.g. security, data-privacy, code-quality). Orch automatically detects the domain of each prompt and applies the matching profile." },
      { type: "h3", text: "Health scoring" },
      { type: "p", text: "Every constraint has a health score from 0–100. The score drops when developers override the constraint. A score below 70 triggers a warning." },
      { type: "table", headers: ["Score", "Status", "Meaning"], rows: [
        ["80–100", "Healthy", "Constraints are being followed"],
        ["60–79", "Warning", "Frequent overrides — review the constraint"],
        ["0–59", "Critical", "Constraint is being ignored — action required"],
      ]},
      { type: "h3", text: "Per-model variants" },
      { type: "p", text: "You can write different constraint text for GPT, Claude, and Gemini. Each model interprets instructions differently — variants let you tune for each." },
      { type: "callout", variant: "info", text: "Use the Constraint Sandbox on the Constraints page to test how a constraint affects a prompt before publishing it." },
    ],
  },
  {
    id: "models",
    title: "Model Management",
    audience: "admin",
    content: [
      { type: "p", text: "Orch supports 67 models across 13 providers. Admins control which models developers can use." },
      { type: "h3", text: "Model policy" },
      { type: "table", headers: ["Policy", "Behavior"], rows: [
        ["Enforced", "All requests use one specific model. Developers cannot override."],
        ["Allowlist", "Developers can choose from a list of approved models."],
        ["Open", "Developers can use any model in the registry."],
      ]},
      { type: "h3", text: "Adding a model" },
      { type: "list", items: [
        "Go to Models in the sidebar",
        "Click Add Model",
        "Select provider and model",
        "Paste the API key — it is encrypted at rest with AES-256",
        "Set as default or add to allowlist",
      ]},
      { type: "h3", text: "Fallback chain" },
      { type: "p", text: "If the primary model fails, Orch automatically tries the next model in your fallback chain. Configure the order in the Models page." },
      { type: "callout", variant: "tip", text: "Orch monitors for new model releases and notifies you when a new version is available from your providers." },
    ],
  },
  {
    id: "team",
    title: "Team Management",
    audience: "admin",
    content: [
      { type: "p", text: "Manage who has access to your Orch org and what they can do." },
      { type: "h3", text: "Roles" },
      { type: "table", headers: ["Role", "Permissions"], rows: [
        ["Owner", "Full access. Can delete org, manage billing."],
        ["Admin", "Manage team, constraints, models, view all audit logs."],
        ["Member", "Chat, audit, view own sessions."],
        ["Viewer", "Read-only access to dashboard."],
      ]},
      { type: "h3", text: "Inviting a developer" },
      { type: "list", items: [
        "Go to Team in the sidebar",
        "Click Invite Member",
        "Enter their email and select a role",
        "They receive an email with a signup link",
        "On signup, they are automatically added to your org",
      ]},
      { type: "h3", text: "API key management" },
      { type: "p", text: "Each member gets a personal API key on signup. Admins can revoke keys from the Team page. Revoked keys stop working immediately." },
    ],
  },
  {
    id: "cli",
    title: "CLI",
    audience: "developer",
    content: [
      { type: "p", text: "The Orch CLI lets you interact with the API from your terminal." },
      { type: "h3", text: "Installation" },
      { type: "code", lang: "bash", text: `pip install orch-cli` },
      { type: "h3", text: "Login" },
      { type: "code", lang: "bash", text: `orch login --key orch_xxxxxxxxxxxx --url https://your-orch-instance` },
      { type: "h3", text: "Commands" },
      { type: "table", headers: ["Command", "Description"], rows: [
        ["orch ask \"<prompt>\"", "Send a single prompt"],
        ["orch chat", "Start an interactive session"],
        ["orch audit <file>", "Audit a file for constraint violations"],
        ["orch models", "List available models"],
        ["orch status", "Show org and team info"],
        ["orch health", "Show constraint health scores"],
        ["orch override", "Log a constraint override with reason"],
      ]},
      { type: "h3", text: "Example session" },
      { type: "code", lang: "bash", text: `$ orch chat
> You: Review this function for SQL injection
> Orch: I found 2 potential issues...
> You: exit` },
    ],
  },
  {
    id: "extension",
    title: "VS Code Extension",
    audience: "developer",
    content: [
      { type: "p", text: "The Orch VS Code extension brings constraint-aware AI directly into your editor." },
      { type: "h3", text: "Installation" },
      { type: "list", items: [
        "Open VS Code",
        "Go to Extensions (Ctrl+Shift+X)",
        "Search for Orch",
        "Click Install",
        "Open Command Palette → Orch: Set API Key",
      ]},
      { type: "h3", text: "Features" },
      { type: "table", headers: ["Feature", "How to use"], rows: [
        ["Audit file", "Right-click any file → Orch: Audit File"],
        ["Inline ask", "Select code → Orch: Ask about selection"],
        ["Status bar", "Shows active constraint profile at bottom of editor"],
        ["Command palette", "Ctrl+Shift+P → type Orch"],
      ]},
      { type: "callout", variant: "info", text: "The extension uses the same API key as the CLI. Set it once and it works everywhere." },
    ],
  },
  {
    id: "audit-log",
    title: "Audit Log",
    audience: "admin",
    content: [
      { type: "p", text: "Every request made through Orch is logged. The audit log gives you full visibility into what your developers are asking and how much it costs." },
      { type: "h3", text: "What is logged" },
      { type: "list", items: [
        "Developer identity (email, team)",
        "Timestamp and session ID",
        "Model used and token counts",
        "Input and output tokens",
        "Constraint version applied",
        "Any overrides with stated reasons",
      ]},
      { type: "h3", text: "Cost attribution" },
      { type: "p", text: "Token costs are attributed per developer, per model, and per team. Use the Analytics page for charts and breakdowns." },
      { type: "callout", variant: "warning", text: "Message content is not stored by default. Only metadata is logged. Enable content logging in Settings if required for compliance." },
    ],
  },
  {
    id: "rag",
    title: "RAG Integration",
    audience: "both",
    content: [
      { type: "p", text: "RAG (Retrieval-Augmented Generation) lets Orch answer questions using your own documents, codebases, and knowledge bases — not just the model's training data. Instead of hoping the model knows your internal architecture, you give it the exact context it needs." },
      { type: "h3", text: "How RAG works with Orch" },
      { type: "p", text: "The standard Orch pipeline is: prompt → constraint injection → model. With RAG, it becomes: prompt → retrieval → constraint injection → model + context. Your documents are chunked, embedded, and stored in a vector database. On each request, the most relevant chunks are retrieved and injected alongside the constraint." },
      { type: "callout", variant: "info", text: "RAG does not replace constraints — it works alongside them. The retrieved context is injected into the prompt, the constraint is still enforced on top." },
      { type: "h3", text: "Step 1 — Set up pgvector" },
      { type: "p", text: "Orch uses PostgreSQL already. Enable the pgvector extension to store embeddings in the same database — no new infrastructure needed." },
      { type: "code", lang: "sql", text: `-- Run once on your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the documents table
CREATE TABLE orch_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL,
  title       TEXT,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  metadata    JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX ON orch_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);` },
      { type: "h3", text: "Step 2 — Chunk and embed your documents" },
      { type: "p", text: "Split documents into chunks of 500-1000 tokens. Smaller chunks give more precise retrieval. Larger chunks give more context per result. Start with 512 tokens and adjust." },
      { type: "code", lang: "python", text: `import litellm
import asyncpg

async def ingest_document(org_id: str, title: str, content: str, conn):
    # Split into chunks (~512 tokens each)
    chunks = chunk_text(content, max_tokens=512)
    
    for chunk in chunks:
        # Generate embedding using any model
        response = await litellm.aembedding(
            model="text-embedding-3-small",  # OpenAI
            input=chunk
        )
        embedding = response.data[0].embedding
        
        await conn.execute(
            """INSERT INTO orch_documents 
               (org_id, title, content, embedding)
               VALUES ($1, $2, $3, $4)""",
            org_id, title, chunk, embedding
        )

def chunk_text(text: str, max_tokens: int = 512) -> list[str]:
    # Simple recursive character splitting
    words = text.split()
    chunks, current = [], []
    count = 0
    for word in words:
        current.append(word)
        count += 1
        if count >= max_tokens:
            chunks.append(" ".join(current))
            current, count = [], 0
    if current:
        chunks.append(" ".join(current))
    return chunks` },
      { type: "h3", text: "Step 3 — Retrieve relevant chunks" },
      { type: "p", text: "On each request, embed the user's prompt and find the most similar chunks using cosine similarity. Return the top 3-5 results." },
      { type: "code", lang: "python", text: `async def retrieve(org_id: str, query: str, conn, top_k: int = 4) -> list[str]:
    # Embed the query
    response = await litellm.aembedding(
        model="text-embedding-3-small",
        input=query
    )
    query_embedding = response.data[0].embedding
    
    # Find most similar chunks
    rows = await conn.fetch(
        """SELECT content, 
               1 - (embedding <=> $1::vector) AS similarity
           FROM orch_documents
           WHERE org_id = $2
           ORDER BY embedding <=> $1::vector
           LIMIT $3""",
        query_embedding, org_id, top_k
    )
    
    return [row["content"] for row in rows if row["similarity"] > 0.7]` },
      { type: "h3", text: "Step 4 — Inject into the Orch pipeline" },
      { type: "p", text: "Pass retrieved context in the system prompt alongside your constraint. Orch's constraint is still enforced — the RAG context just gives the model more to work with." },
      { type: "code", lang: "python", text: `import httpx

async def rag_ask(query: str, org_id: str, api_key: str, conn):
    # Retrieve relevant context
    chunks = await retrieve(org_id, query, conn)
    context = "\\n\\n".join(chunks)
    
    # Build augmented prompt
    augmented_prompt = f"""Use the following context to answer the question.
    
Context:
{context}

Question: {query}"""
    
    # Send to Orch — constraints still apply
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://your-orch-instance/api/v1/orchestrate",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "messages": [{"role": "user", "content": augmented_prompt}],
                "stream": False
            }
        )
    return response.json()` },
      { type: "h3", text: "Chunking strategies" },
      { type: "table", headers: ["Strategy", "Best for", "Chunk size"], rows: [
        ["Fixed size", "General documents, quick setup", "512 tokens"],
        ["Recursive", "Code, structured text", "256-512 tokens"],
        ["Semantic", "Long documents, high accuracy", "Variable"],
        ["By section", "Docs with clear headings", "Full section"],
      ]},
      { type: "h3", text: "Embedding models" },
      { type: "table", headers: ["Model", "Provider", "Dimensions", "Best for"], rows: [
        ["text-embedding-3-small", "OpenAI", "1536", "General use, low cost"],
        ["text-embedding-3-large", "OpenAI", "3072", "High accuracy"],
        ["embed-english-v3.0", "Cohere", "1024", "English documents"],
        ["nomic-embed-text", "Local (Ollama)", "768", "Private, no API cost"],
      ]},
      { type: "callout", variant: "tip", text: "Use the same embedding model for ingestion and retrieval. Mixing models will give wrong results." },
      { type: "h3", text: "Use cases in Orch" },
      { type: "list", items: [
        "Upload your internal coding standards — developers ask questions, Orch retrieves the relevant standard",
        "Index your codebase — ask \"how does our auth system work\" and get answers from your actual code",
        "Constraint knowledge base — retrieve past constraint violations to inform new ones",
        "Onboarding docs — new developers ask questions, get answers from your internal wiki",
        "Incident history — retrieve past incidents when debugging similar issues",
      ]},
      { type: "callout", variant: "warning", text: "RAG retrieval quality depends on chunk quality. Bad chunking = irrelevant context = worse answers than no RAG at all. Always evaluate retrieval before deploying." },
    ],
  },
]
