"use client"

import { useState } from "react"
import Link from "next/link"
import { Shield, Terminal, ArrowLeft, Copy, Check, Cpu, BookOpen, GitBranch, Key, Layers, Lock, Server, Sun, Moon, Menu, X } from "lucide-react"
import { useTheme } from "@/components/layout/ThemeProvider"

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { theme, toggle } = useTheme()

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
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans transition-colors">
      
      {/* Responsive Header Bar */}
      <header className="sticky top-0 z-50 h-14 sm:h-16 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity shrink-0">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">Orch</span>
            <span className="ml-2 text-xs font-mono text-[var(--text-secondary)] hidden sm:inline">/ docs</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          <Link href="/" className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <Link href="/sign-in" className="text-xs font-semibold bg-[var(--accent)] text-white px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
            Dashboard
          </Link>
        </div>

        {/* Mobile Nav Controls */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="sm:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileNavOpen(false)}>
          <div className="w-[280px] h-full bg-[var(--surface)] border-r border-[var(--border)] p-5 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <span className="text-base font-bold text-[var(--text-primary)]">Docs Navigation</span>
              <button onClick={() => setMobileNavOpen(false)} className="text-[var(--text-secondary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
              {SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => { setActiveSection(sec.id); setMobileNavOpen(false) }}
                  className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    activeSection === sec.id
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)]"
                  }`}
                >
                  {sec.label}
                </a>
              ))}
            </nav>

            <div className="pt-4 border-t border-[var(--border)] space-y-2">
              <Link href="/" onClick={() => setMobileNavOpen(false)} className="block px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                ← Back to Home
              </Link>
              <Link href="/sign-in" onClick={() => setMobileNavOpen(false)} className="block px-3 py-2.5 rounded-md bg-[var(--accent)] text-white text-sm font-semibold text-center">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
        
        {/* Mobile Section Switcher Dropdown */}
        <div className="md:hidden p-4 border-b border-[var(--border)] bg-[var(--surface)] sticky top-14 sm:top-16 z-30 w-full">
          <label className="block text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Documentation Section:</label>
          <select
            value={activeSection}
            onChange={(e) => {
              setActiveSection(e.target.value)
              const el = document.getElementById(e.target.value)
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            className="w-full p-2.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] outline-none"
          >
            {SECTIONS.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sticky Sidebar Navigation (Desktop) */}
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
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
                }`}
              >
                {sec.label}
              </a>
            ))}
          </nav>

          <div className="mt-8 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5 text-[var(--text-primary)]">
              <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" /> Native MCP Server
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Connect Cursor or Claude Desktop in 30 seconds using standard <code className="font-mono">stdio</code>.
            </p>
          </div>
        </aside>

        {/* Documentation Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-4xl space-y-12 sm:space-y-16 overflow-y-auto">
          
          {/* Section 1: Overview */}
          <section id="overview" className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" /> 1. Overview
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">What is Orch?</h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Orch is an enterprise-grade AI governance middleware and Model Context Protocol (MCP) server. It sits between developers (or autonomous AI agents) and the LLMs they use, dynamically injecting organizational constraints into AI tools and auditing code before it reaches production.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
                <p className="text-xs font-bold text-[var(--accent)] uppercase">For Developers</p>
                <p className="text-xs text-[var(--text-secondary)]">Zero workflow friction. MCP automatically feeds company coding rules into Cursor and Claude.</p>
              </div>
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
                <p className="text-xs font-bold text-purple-500 dark:text-purple-400 uppercase">For CTOs & Tech Leads</p>
                <p className="text-xs text-[var(--text-secondary)]">Complete control plane over AI models, token usage, constraint health, and GitHub PR reviews.</p>
              </div>
            </div>
          </section>

          {/* Section 2: MCP Integration */}
          <section id="mcp-guide" className="space-y-6 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" /> 2. Model Context Protocol (MCP) Integration
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Plug-and-Play Setup</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Orch runs a native MCP server via standard input/output (<code className="font-mono text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded border">stdio</code>). No local code cloning or manual builds required.
            </p>

            {/* Cursor Setup */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" /> Option A: Cursor IDE Setup
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Create or open <code className="font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">.cursor/mcp.json</code> in your project root or global Cursor settings:
              </p>
              <div className="relative rounded-lg border border-[var(--border)] bg-[#0d1117] dark:bg-[#0d1117] overflow-hidden">
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#161b22] border-b border-[var(--border)] text-xs text-gray-400">
                  <span className="font-mono truncate">.cursor/mcp.json</span>
                  <button
                    onClick={() => copyCode(cursorMcpSnippet, "cursor")}
                    className="flex items-center gap-1 text-[11px] hover:text-white transition-colors shrink-0 ml-2 cursor-pointer"
                  >
                    {copiedKey === "cursor" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === "cursor" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="p-3 sm:p-4 text-xs font-mono text-emerald-300 overflow-x-auto">
                  {cursorMcpSnippet}
                </pre>
              </div>
            </div>

            {/* Claude Desktop Setup */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 shrink-0" /> Option B: Claude Desktop Setup
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Add to <code className="font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">claude_desktop_config.json</code>:
              </p>
              <div className="relative rounded-lg border border-[var(--border)] bg-[#0d1117] dark:bg-[#0d1117] overflow-hidden">
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#161b22] border-b border-[var(--border)] text-xs text-gray-400">
                  <span className="font-mono truncate">claude_desktop_config.json</span>
                  <button
                    onClick={() => copyCode(claudeDesktopSnippet, "claude")}
                    className="flex items-center gap-1 text-[11px] hover:text-white transition-colors shrink-0 ml-2 cursor-pointer"
                  >
                    {copiedKey === "claude" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === "claude" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="p-3 sm:p-4 text-xs font-mono text-purple-300 overflow-x-auto">
                  {claudeDesktopSnippet}
                </pre>
              </div>
            </div>
          </section>

          {/* Section 3: MCP Exposed Tools */}
          <section id="mcp-tools" className="space-y-6 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5" /> 3. MCP Exposed Tools
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Available MCP Functions</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              When Orch MCP is connected, AI tools automatically gain access to these 3 core governance functions:
            </p>

            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <code className="text-xs font-bold text-[var(--accent)] font-mono">fetch_policy</code>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] border text-[var(--text-secondary)] font-mono w-fit">GET /v1/sync</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Retrieves the active coding guidelines and architectural constraints for the workspace (e.g. tech stack rules, security policies, database conventions).
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <code className="text-xs font-bold text-purple-500 dark:text-purple-400 font-mono">add_constraint</code>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] border text-[var(--text-secondary)] font-mono w-fit">PUT /v1/constraints/:id</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Allows AI agents to dynamically submit new learned constraints back to the workspace when discovering repository-specific patterns.
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <code className="text-xs font-bold text-cyan-500 dark:text-cyan-400 font-mono">evaluate_code</code>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] border text-[var(--text-secondary)] font-mono w-fit">POST /v1/review</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Evaluates a code diff against active constraint profiles before committing or submitting a pull request. Returns <code className="font-mono text-[11px]">CLEAN</code> or detailed violation issues.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Policy & Constraint Profiles */}
          <section id="policy-system" className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-purple-500/10 text-purple-500 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" /> 4. Policy & Constraint Profiles
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Governance Profiles</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Orch ships with specialized built-in constraint profiles that can be assigned per project or workspace:
            </p>

            <ul className="space-y-3 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">▪</span>
                <div><strong className="text-[var(--text-primary)]">Backend Profile:</strong> Restricts raw SQL, enforces parameterized queries, handles transaction boundaries, and monitors thread pooling.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">▪</span>
                <div><strong className="text-[var(--text-primary)]">Cybersecurity Profile:</strong> Enforces input sanitization, prevents secret leakage, sanitizes JWT verification, and checks CORS parameters.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">▪</span>
                <div><strong className="text-[var(--text-primary)]">Blockchain Profile:</strong> Audits re-entrancy risks, integer overflow guards, and gas optimization patterns.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">▪</span>
                <div><strong className="text-[var(--text-primary)]">Frontend Profile:</strong> Enforces accessibility standards, prevents XSS via innerHTML, and ensures semantic HTML usage.</div>
              </li>
            </ul>
          </section>

          {/* Section 5: GitHub App Integration */}
          <section id="github-integration" className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <GitBranch className="w-3.5 h-3.5" /> 5. GitHub App Integration
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Automated PR Review</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Install the Orch GitHub App on your repository to automatically evaluate every Pull Request. Orch leaves inline comments and blocks PRs that violate your organization's policy constraints.
            </p>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold text-[var(--text-primary)]">How it works:</p>
              <ol className="space-y-2 text-xs text-[var(--text-secondary)] list-decimal list-inside">
                <li>Install the Orch GitHub App on your target repository.</li>
                <li>Orch listens for <code className="font-mono bg-[var(--background)] px-1 rounded">pull_request</code> webhook events.</li>
                <li>Each diff is semantically analyzed against active constraint profiles.</li>
                <li>Violations are posted as inline review comments with remediation hints.</li>
                <li>Hard violations can block merge via required status checks.</li>
              </ol>
            </div>
          </section>

          {/* Section 6: API Reference */}
          <section id="api-reference" className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Server className="w-3.5 h-3.5" /> 6. Core API Endpoints
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">REST API Reference</h2>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">GET /api/v1/sync</span>
                <span className="text-[var(--text-secondary)]">Sync workspace constraints</span>
              </div>
              <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-blue-600 dark:text-blue-400 font-bold">POST /api/v1/review</span>
                <span className="text-[var(--text-secondary)]">Evaluate code diff against policy</span>
              </div>
              <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-purple-600 dark:text-purple-400 font-bold">GET /api/v1/onboarding/me</span>
                <span className="text-[var(--text-secondary)]">User org & team context</span>
              </div>
              <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-amber-600 dark:text-amber-400 font-bold">PUT /api/v1/constraints/:id</span>
                <span className="text-[var(--text-secondary)]">Create or update constraint</span>
              </div>
              <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-rose-600 dark:text-rose-400 font-bold">DELETE /api/v1/constraints/:id</span>
                <span className="text-[var(--text-secondary)]">Archive a constraint</span>
              </div>
            </div>
          </section>

          {/* Section 7: Security & Canary Protection */}
          <section id="security" className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" /> 7. Security & Canary Protection
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Enterprise Security Architecture</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Orch employs multiple layers of security to protect your organization's code, API keys, and governance policies.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> API Key Security
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  All API keys are hashed with SHA-256 at rest. Keys are only displayed once during onboarding and never stored in plaintext.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Canary Token Detection
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Orch injects invisible canary tokens into policy payloads. If constraints leak externally, the canary triggers an instant alert.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
                <p className="text-xs font-bold text-[var(--accent)] uppercase flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Role-Based Access Control
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Workspace members are assigned roles (Owner, Admin, Member). Constraint editing, model management, and team invites are restricted by role.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Audit Trail
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Every policy sync, code review, and constraint modification is logged with timestamps, user IDs, and IP addresses for full compliance auditing.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-2">
              <p className="text-xs font-semibold text-[var(--text-primary)]">Transport & Data Security</p>
              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>All API traffic encrypted via TLS 1.3</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>MCP stdio communication runs locally — no code leaves your machine</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>GitHub webhook payloads verified with HMAC SHA-256 signatures</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>Session tokens managed via Clerk with automatic rotation</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Bottom Spacer */}
          <div className="pb-8" />
        </main>
      </div>
    </div>
  )
}
