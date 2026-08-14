"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Shield, Terminal, ArrowRight, ShieldAlert, CheckCircle2, GitPullRequest, Layers, Sun, Moon } from "lucide-react"
import Link from "next/link"
import { useMe } from "@/hooks/useRole"
import { useTheme } from "@/components/layout/ThemeProvider"

const INTERACTIVE_EXAMPLES = [
  {
    id: "sql",
    label: "SQL Security Guard",
    description: "Intercepts raw SQL strings & parameterizes queries before database execution.",
    unsafe: `// UNCHECKED DRAFT
const query = "SELECT * FROM users WHERE email = '" + req.body.email + "'";
const user = await db.query(query);`,
    remediated: `// ENFORCED & REMEDIATED
const user = await db.select()
  .from(users)
  .where(eq(users.email, req.body.email));`,
    rule: "backend_sql_parameterized",
  },
  {
    id: "secrets",
    label: "Secret & Key Protection",
    description: "Prevents hardcoded API keys, JWT secrets, and tokens from entering code commits.",
    unsafe: `// UNCHECKED DRAFT
const stripeClient = new Stripe("sk_live_994827189381726");
const jwtSecret = "super_secret_my_company_key";`,
    remediated: `// ENFORCED & REMEDIATED
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
const jwtSecret = process.env.JWT_SECRET!;`,
    rule: "cyber_no_plaintext_secrets",
  },
  {
    id: "types",
    label: "Strict Type Safety",
    description: "Enforces strict TypeScript boundaries and prevents un-typed 'any' bypasses.",
    unsafe: `// UNCHECKED DRAFT
function processOrder(data: any): any {
  return data.items.map((i: any) => i.price * i.qty);
}`,
    remediated: `// ENFORCED & REMEDIATED
function processOrder(data: OrderPayload): OrderSummary {
  return { total: data.items.reduce((sum, item) => sum + (item.price * item.qty), 0) };
}`,
    rule: "general_strict_typescript",
  },
]

const PIPELINE_LAYERS = [
  {
    step: "01",
    tag: "IDE INTEGRATION",
    title: "Native MCP stdio Server",
    description: "Connect Cursor, Claude Desktop, or Windsurf in 30 seconds. Rules are injected directly into your AI context before prompt execution.",
    codeSnippet: `{
  "mcpServers": {
    "orch": {
      "command": "npx",
      "args": ["-y", "orch-ai@latest", "mcp"]
    }
  }
}`,
    status: "READY",
  },
  {
    step: "02",
    tag: "CI/CD BOUNDARY",
    title: "Automated PR Sentinel",
    description: "The Orch GitHub App acts as an automated Staff Engineer, semantically evaluating pull request diffs and blocking policy violations before merge.",
    codeSnippet: `name: Orch Policy Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: orch-dev/action@latest`,
    status: "ACTIVE",
  },
  {
    step: "03",
    tag: "CONTROL PLANE",
    title: "Centralized Telemetry & Policy",
    description: "Full enterprise dashboard for model policy management, token budget caps, per-developer audit trails, and constraint health metrics.",
    codeSnippet: `GET /api/v1/analytics
→ 98.4% Policy Compliance Rate
→ 12 Active Constraint Profiles
→ 0 Blocked Hard Violations`,
    status: "LIVE",
  },
]

export default function LandingPage() {
  const { data: me } = useMe()
  const { theme, toggle } = useTheme()
  const ctaHref = me?.org_id ? "/home" : "/onboarding"
  const ctaLabel = me?.org_id ? "DASHBOARD →" : "GET STARTED →"
  const heroCtaLabel = me?.org_id ? "OPEN WORKSPACE" : "LAUNCH WORKSPACE"

  const [activeTab, setActiveTab] = useState(0)
  const [activeLayer, setActiveLayer] = useState(0)
  const currentExample = INTERACTIVE_EXAMPLES[activeTab]
  const currentLayer = PIPELINE_LAYERS[activeLayer]

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)] selection:text-white relative overflow-hidden transition-colors">
      
      {/* Background Matrix Overlay - Dynamic for Light/Dark */}
      <div className="absolute top-0 left-0 right-0 h-[750px] pointer-events-none opacity-20 dark:opacity-25">
        <img 
          src="/matrix-bg.png" 
          alt="Orch Matrix Background" 
          className="w-full h-full object-cover object-center mask-radial"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/80 to-[var(--background)]" />
      </div>

      {/* Header Navigation */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md z-50 flex items-center justify-between px-4 sm:px-8 max-w-[1440px] mx-auto">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Orch</span>
        </Link>

        <div className="flex items-center gap-5">
          <button
            onClick={toggle}
            className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center justify-center"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <Link href="/docs" className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            DOCS
          </Link>
          <Link href={me?.org_id ? "/home" : "/sign-in"} className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            {me?.org_id ? "WORKSPACE" : "SIGN IN"}
          </Link>
          <Link href={ctaHref} className="text-xs font-semibold bg-[var(--accent)] text-white px-4 py-2 rounded-md hover:bg-[var(--accent-hover)] transition-colors shadow-sm font-mono cursor-pointer">
            {ctaLabel}
          </Link>
        </div>
      </header>

      {/* Main Content with Generous Spacing */}
      <main className="relative z-10 pt-32 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto space-y-32">

        {/* HERO SECTION - Spacious Asymmetric Layout */}
        <section className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Title & Intro */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <div className="space-y-4">
              <span className="text-xs font-mono text-[var(--accent)] font-semibold tracking-wider uppercase">
                ORCH GOVERNANCE PLATFORM
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[1.08] text-[var(--text-primary)]">
                AI Writes The Code <br />
                <span className="text-[var(--accent)]">
                  Orch Enforces The Rules
                </span>
              </h1>
            </div>

            <p className="text-base text-[var(--text-secondary)] leading-relaxed font-sans max-w-lg">
              Orch is the central control plane for software governance. Define Policy-as-Code once. Orch injects constraints into Cursor & Claude via MCP, and audits PRs at the GitHub boundary.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href={ctaHref} className="flex items-center gap-2 bg-[var(--accent)] text-white font-mono text-xs font-semibold px-6 py-3.5 rounded-md hover:bg-[var(--accent-hover)] transition-colors shadow-lg cursor-pointer">
                {heroCtaLabel} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/docs" className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-mono text-xs font-medium px-5 py-3.5 rounded-md hover:border-[var(--accent)]/50 transition-colors cursor-pointer">
                <Terminal className="w-4 h-4 text-[var(--text-secondary)]" /> MCP SPECS
              </Link>
            </div>
          </div>

          {/* Right Column: Clean Interactive Code Interceptor */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Rule Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border)]">
              {INTERACTIVE_EXAMPLES.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2 rounded-t-md text-xs font-mono transition-colors cursor-pointer border-t border-x ${
                    activeTab === i
                      ? "bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)] font-semibold border-b-transparent"
                      : "bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* Interceptor Code Box */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xl">
              
              {/* Header Bar */}
              <div className="px-5 py-3 bg-[var(--background)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
                  <span>RULE:</span>
                  <span className="text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-0.5 rounded border border-[var(--accent)]/20">{currentExample.rule}</span>
                </div>
                <span className="text-[var(--text-secondary)] text-[11px] hidden sm:inline">{currentExample.description}</span>
              </div>

              {/* Side-by-side Diffs */}
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
                
                {/* Left: Unsafe Code */}
                <div className="p-5 space-y-3 bg-[var(--surface)]">
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-semibold"><ShieldAlert className="w-3.5 h-3.5" /> AI Draft</span>
                    <span className="text-[10px] bg-rose-500/10 text-rose-500 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 font-mono">BLOCKED</span>
                  </div>
                  <pre className="p-3.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[11px] font-mono text-rose-600 dark:text-rose-300 leading-relaxed overflow-x-auto">
                    {currentExample.unsafe}
                  </pre>
                </div>

                {/* Right: Enforced Code */}
                <div className="p-5 space-y-3 bg-[var(--surface)]">
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Remediated</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">PASSED</span>
                  </div>
                  <pre className="p-3.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[11px] font-mono text-emerald-700 dark:text-emerald-300 leading-relaxed overflow-x-auto">
                    {currentExample.remediated}
                  </pre>
                </div>
              </div>

              <div className="px-5 py-2.5 bg-[var(--background)] border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                <span>Intercepted at commit boundary</span>
                <span className="text-[var(--text-primary)]">Latency: 0.4ms</span>
              </div>
            </div>
          </div>
        </section>

        {/* PIPELINE BLUEPRINT - Clean Spacious Section */}
        <section className="space-y-10 border-t border-[var(--border)] pt-16">
          <div className="space-y-2 text-left">
            <span className="text-xs font-mono text-[var(--accent)] font-semibold uppercase tracking-wider">PIPELINE ARCHITECTURE</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-mono">
              Three Layers of Code Governance
            </h2>
          </div>

          {/* 3 Step Interactive Selector */}
          <div className="grid lg:grid-cols-3 gap-6">
            {PIPELINE_LAYERS.map((layer, i) => (
              <button
                key={layer.step}
                onClick={() => setActiveLayer(i)}
                className={`p-6 rounded-xl border text-left transition-all cursor-pointer space-y-4 relative ${
                  activeLayer === i
                    ? "bg-[var(--surface)] border-[var(--accent)] shadow-xl ring-1 ring-[var(--accent)]/30"
                    : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/40"
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-2xl font-bold text-[var(--text-secondary)]">{layer.step}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--background)] font-mono text-[var(--text-secondary)]">
                    {layer.status}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-[var(--accent)] uppercase">{layer.tag}</span>
                  <h3 className="text-base font-bold text-[var(--text-primary)] font-mono">{layer.title}</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {layer.description}
                </p>
              </button>
            ))}
          </div>

          {/* Selected Layer Configuration Blueprint */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between text-xs font-mono border-b border-[var(--border)] pb-4">
              <span className="text-[var(--text-primary)] font-bold font-mono">LAYER {currentLayer.step}: {currentLayer.title}</span>
              <span className="text-[var(--text-secondary)] font-mono">{currentLayer.tag}</span>
            </div>
            
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4 text-left">
                <h4 className="text-lg font-bold text-[var(--text-primary)] font-mono">{currentLayer.title}</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  {currentLayer.description}
                </p>
                <div className="pt-2">
                  <Link href="/docs" className="inline-flex items-center gap-1 text-xs font-mono text-[var(--accent)] hover:underline cursor-pointer">
                    View Full Documentation →
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5 text-xs font-mono text-[var(--text-primary)] overflow-x-auto">
                  <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] border-b border-[var(--border)] pb-2 mb-4">
                    <span>CONFIG SPECIFICATION</span>
                    <span>JSON / YAML</span>
                  </div>
                  <pre className="leading-relaxed font-mono text-[var(--text-primary)]">
                    {currentLayer.codeSnippet}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12 text-center text-xs font-mono text-[var(--text-secondary)] space-y-2">
        <div className="flex items-center justify-center font-bold text-[var(--text-primary)] text-base tracking-tight">
          Orch
        </div>
        <p>© {new Date().getFullYear()} Orch Inc. Centralized Policy-as-Code Engine.</p>
      </footer>
    </div>
  )
}
