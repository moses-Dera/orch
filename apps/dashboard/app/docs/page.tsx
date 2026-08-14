"use client"

import { useState } from "react"
import Link from "next/link"
import { Shield, Terminal, ArrowLeft, Copy, Check, Cpu, BookOpen, GitBranch, Key, Layers, Lock, Server } from "lucide-react"

const SECTIONS = [
  { id: "overview", label: "1. Overview & Architecture" },
  { id: "mcp-guide", label: "2. MCP Integration (Cursor & Claude)" },
  { id: "mcp-tools", label: "3. MCP Exposed Tools" },
  { id: "policy-system", label: "4. Policy & Constraint Profiles" },
  { id: "github-integration", label: "5. GitHub App Integration" },
  { id: "api-reference", label: "6. API Reference" },
  { id: "security", label: "7. Security & Canary Protection" },
]

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  function copyCode(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const cursorMcpSnippet = `{
  "mcpServers": {
    "orch": {
      "command": "npx",
      "args": ["-y", "orch-ai@latest", "mcp"],
      "env": {
        "ORCH_API_KEY": "YOUR_ORCH_API_KEY"
      }
    }
  }
}`

  const claudeDesktopSnippet = `{
  "mcpServers": {
    "orch": {
      "command": "npx",
      "args": ["-y", "orch-ai@latest", "mcp"],
      "env": {
        "ORCH_API_KEY": "YOUR_ORCH_API_KEY"
      }
    }
  }
}`

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-50 h-16 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">Orch</span>
            <span className="ml-2 text-xs font-mono text-[var(--text-secondary)]">/ docs</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <Link href="/sign-in" className="text-xs font-semibold bg-[var(--accent)] text-white px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
            Go to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex min-h-[calc(100vh-4rem)]">
        
        {/* Sticky Sidebar Navigation */}
        <aside className="w-64 border-r border-[var(--border)] p-6 shrink-0 hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Table of Contents</p>
          <nav className="space-y-1">
            {SECTIONS.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={`block px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeSection === sec.id
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
                }`}
              >
                {sec.label}
              </a>
            ))}
          </nav>

          <div className="mt-8 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5 text-[var(--foreground)]">
              <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" /> Native MCP Server
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Connect Cursor or Claude Desktop in 30 seconds using standard <code className="font-mono">stdio</code>.
            </p>
          </div>
        </aside>

        {/* Documentation Content Area */}
        <main className="flex-1 p-6 md:p-10 max-w-4xl space-y-16 overflow-y-auto">
          
          {/* Section 1: Overview */}
          <section id="overview" className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" /> 1. Overview
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">What is Orch?</h1>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              Orch is an enterprise-grade AI governance middleware and Model Context Protocol (MCP) server. It sits between developers (or autonomous AI agents) and the LLMs they use, dynamically injecting organizational constraints into AI tools and auditing code before it reaches production.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
                <p className="text-xs font-bold text-[var(--accent)] uppercase">For Developers</p>
                <p className="text-xs text-[var(--text-secondary)]">Zero workflow friction. MCP automatically feeds company coding rules into Cursor and Claude.</p>
              </div>
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
                <p className="text-xs font-bold text-purple-400 uppercase">For CTOs & Tech Leads</p>
                <p className="text-xs text-[var(--text-secondary)]">Complete control plane over AI models, token usage, constraint health, and GitHub PR reviews.</p>
              </div>
            </div>
          </section>

          {/* Section 2: MCP Integration */}
          <section id="mcp-guide" className="space-y-6 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" /> 2. Model Context Protocol (MCP) Integration
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Plug-and-Play Setup</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Orch runs a native MCP server via standard input/output (<code className="font-mono text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded border">stdio</code>). No local code cloning or manual builds required.
            </p>

            {/* Cursor Setup */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Option A: Cursor IDE Setup
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Create or open <code className="font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">.cursor/mcp.json</code> in your project root or global Cursor settings:
              </p>
              <div className="relative rounded-lg border border-[var(--border)] bg-[#0d1117] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[var(--border)] text-xs text-gray-400">
                  <span className="font-mono">.cursor/mcp.json</span>
                  <button
                    onClick={() => copyCode(cursorMcpSnippet, "cursor")}
                    className="flex items-center gap-1 text-[11px] hover:text-white transition-colors"
                  >
                    {copiedKey === "cursor" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === "cursor" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto">
                  {cursorMcpSnippet}
                </pre>
              </div>
            </div>

            {/* Claude Desktop Setup */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Option B: Claude Desktop Setup
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Add to <code className="font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">claude_desktop_config.json</code>:
              </p>
              <div className="relative rounded-lg border border-[var(--border)] bg-[#0d1117] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[var(--border)] text-xs text-gray-400">
                  <span className="font-mono">claude_desktop_config.json</span>
                  <button
                    onClick={() => copyCode(claudeDesktopSnippet, "claude")}
                    className="flex items-center gap-1 text-[11px] hover:text-white transition-colors"
                  >
                    {copiedKey === "claude" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === "claude" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-purple-300 overflow-x-auto">
                  {claudeDesktopSnippet}
                </pre>
              </div>
            </div>
          </section>

          {/* Section 3: MCP Exposed Tools */}
          <section id="mcp-tools" className="space-y-6 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5" /> 3. MCP Exposed Tools
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Available MCP Functions</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              When Orch MCP is connected, AI tools automatically gain access to these 3 core governance functions:
            </p>

            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-xs font-bold text-[var(--accent)] font-mono">fetch_policy</code>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] border text-[var(--text-secondary)] font-mono">GET /v1/sync</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Retrieves the active coding guidelines and architectural constraints for the workspace (e.g. tech stack rules, security policies, database conventions).
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-xs font-bold text-purple-400 font-mono">add_constraint</code>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] border text-[var(--text-secondary)] font-mono">PUT /v1/constraints/:id</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Allows AI agents to dynamically submit new learned constraints back to the workspace when discovering repository-specific patterns.
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-xs font-bold text-cyan-400 font-mono">evaluate_code</code>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] border text-[var(--text-secondary)] font-mono">POST /v1/review</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Evaluates a code diff against active constraint profiles before committing or submitting a pull request. Returns <code className="font-mono text-[11px]">CLEAN</code> or detailed violation issues.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Policy & Constraint Profiles */}
          <section id="policy-system" className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" /> 4. Policy & Constraint Profiles
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Governance Profiles</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Orch ships with specialized built-in constraint profiles that can be assigned per project or workspace:
            </p>

            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold">▪</span>
                <div><strong className="text-[var(--foreground)]">Backend Profile:</strong> Restricts raw SQL, enforces parameterized queries, handles transaction boundaries, and monitors thread pooling.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold">▪</span>
                <div><strong className="text-[var(--foreground)]">Cybersecurity Profile:</strong> Enforces input sanitization, prevents secret leakage, sanitizes JWT verification, and checks CORS parameters.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold">▪</span>
                <div><strong className="text-[var(--foreground)]">Blockchain Profile:</strong> Audits re-entrancy risks, integer overflow guards, and gas optimization patterns.</div>
              </li>
            </ul>
          </section>

          {/* Section 5: GitHub App Integration */}
          <section id="github-integration" className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <GitBranch className="w-3.5 h-3.5" /> 5. GitHub App Integration
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Automated PR Review</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Install the Orch GitHub App on your repository to automatically evaluate every Pull Request. Orch leaves inline comments and blocks PRs that violate your organization's policy constraints.
            </p>
          </section>

          {/* Section 6: API Reference */}
          <section id="api-reference" className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Server className="w-3.5 h-3.5" /> 6. Core API Endpoints
            </div>
            <h2 className="text-2xl font-bold tracking-tight">REST API Reference</h2>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface)] flex justify-between">
                <span className="text-emerald-400 font-bold">GET /api/v1/sync</span>
                <span className="text-[var(--text-secondary)]">Sync workspace constraints</span>
              </div>
              <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface)] flex justify-between">
                <span className="text-blue-400 font-bold">POST /api/v1/review</span>
                <span className="text-[var(--text-secondary)]">Evaluate code diff against policy</span>
              </div>
              <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface)] flex justify-between">
                <span className="text-purple-400 font-bold">GET /api/v1/onboarding/me</span>
                <span className="text-[var(--text-secondary)]">User org & team context</span>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
