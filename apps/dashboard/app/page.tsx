"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Terminal, ArrowRight, ShieldAlert, CheckCircle2, GitPullRequest, Layers, Sun, Moon, Menu, X } from "lucide-react"
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
    tag: "THE LONG-TERM BRAIN",
    title: "Permanent Vector Memory",
    description: "Your local AI IDE has short-term memory. Orch acts as a permanent, searchable vector database. Define architectural constraints once, and Orch remembers them forever.",
    codeSnippet: `POST /api/v1/constraints
{
  "rule": "Never use console.log, always use Pino.",
  "scope": ["backend/*"]
}
→ Stored securely with pgvector`,
    status: "ACTIVE",
  },
  {
    step: "02",
    tag: "IDE INTEGRATION",
    title: "AI Writes Compliant Code",
    description: "Connect Cursor or Claude Desktop via the Model Context Protocol (MCP). Your IDE automatically reads rules from Orch's memory and stops mistakes before a commit.",
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
    step: "03",
    tag: "CI/CD BOUNDARY",
    title: "Automated Inline PR Reviews",
    description: "The Orch GitHub App acts as an automated Staff Engineer, evaluating pull requests and dropping inline comments exactly where your rules were violated.",
    codeSnippet: `name: Orch Policy Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: orch-dev/action@latest`,
    status: "LIVE",
  },
  {
    step: "04",
    tag: "PERFORMANCE",
    title: "Lightning Fast, Diff-Only",
    description: "Orch never wastes API tokens scanning your entire repository. It exclusively evaluates the exact lines of code that changed (.diff) for lightning-fast and cheap governance.",
    codeSnippet: `GET /api/v1/analytics
→ Avg Eval Latency: 4.2s
→ Tokens Saved: 2.1M
→ Cost/PR: $0.002`,
    status: "LIVE",
  },
]

const MARKETPLACE_SKILLS = [
  {
    id: "@community/react-server-components",
    title: "React Server Components Strict",
    author: "Community",
    downloads: "124k",
    description: "Strict rules for modern React and App Router patterns to prevent data leaks to the client.",
  },
  {
    id: "@security/postgres-rls",
    title: "Postgres RLS Security Guard",
    author: "Security",
    downloads: "89k",
    description: "Row Level Security enforcement patterns ensuring the AI never writes an insecure database query.",
  },
  {
    id: "@owasp/payment-webhooks",
    title: "Secure Payment Webhooks",
    author: "OWASP",
    downloads: "42k",
    description: "Standardized secure handling of third-party payment APIs, idempotency, and signature verification.",
  }
]

export default function LandingPage() {
  const { data: me } = useMe()
  const { theme, toggle } = useTheme()
  const ctaHref = "/chat"
  const ctaLabel = "WORKSPACE →"
  const heroCtaLabel = "LAUNCH WORKSPACE"

  const [activeTab, setActiveTab] = useState(0)
  const [activeLayer, setActiveLayer] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentExample = INTERACTIVE_EXAMPLES[activeTab]
  const currentLayer = PIPELINE_LAYERS[activeLayer]
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)] selection:text-white relative overflow-hidden transition-colors">
      
      {/* Background Overlay (Removed matrix-bg.png to fix color bleed) */}
      <div className="absolute top-0 left-0 right-0 h-[500px] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--surface)]/50 to-transparent" />
      </div>

      {/* Responsive Header Navigation */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md z-50 flex items-center justify-between px-4 sm:px-8 max-w-[1440px] mx-auto">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Orch</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
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
          <Link href={ctaHref} className="text-xs font-semibold bg-[var(--accent)] text-white px-4 py-2 rounded-md hover:bg-[var(--accent-hover)] transition-colors shadow-sm font-mono cursor-pointer">
            {ctaLabel}
          </Link>
        </div>

        {/* Mobile Hamburger Controls */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] flex items-center justify-center cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-Down Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-16 bg-[var(--surface)] border-b border-[var(--border)] p-6 z-40 md:hidden space-y-4 shadow-2xl"
          >
            <nav className="flex flex-col space-y-3 font-mono text-sm">
              <Link
                href="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-md hover:bg-[var(--background)] text-[var(--text-primary)] transition-colors flex items-center justify-between"
              >
                <span>DOCS & MCP GUIDE</span>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)]" />
              </Link>
              <Link
                href={ctaHref}
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-md bg-[var(--accent)] text-white text-center font-semibold transition-colors"
              >
                {ctaLabel}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content with Viewport-Fit Spacing */}
      <main className="relative z-10 pt-20 sm:pt-24 pb-16 sm:pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto space-y-24 sm:space-y-32">

        {/* HERO SECTION - Viewport Optimized Asymmetric Layout */}
        <section className="flex flex-col lg:flex-row items-center justify-between lg:min-h-[calc(100vh-12rem)] w-full py-12 lg:py-0 gap-12 sm:gap-16">
          
          {/* Text Content */}
          <div className="w-full lg:w-1/2 space-y-6 sm:space-y-8 text-left order-1">
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tighter leading-[1.1] sm:leading-[1.05] text-[var(--text-primary)]">
                AI Writes The Code <br />
                <span className="text-[var(--accent)]">
                  Orch Enforces The Rules
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Start for $0 using free models from any AI provider.</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-4">
              <Link href={ctaHref} className="flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--primary-foreground)] font-mono text-xs lg:text-sm font-semibold px-8 py-4 rounded-md hover:bg-[var(--accent-hover)] transition-colors shadow-lg cursor-pointer">
                {heroCtaLabel} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/docs" className="flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-mono text-xs lg:text-sm font-medium px-6 py-4 rounded-md hover:border-[var(--accent)]/50 transition-colors cursor-pointer">
                <Terminal className="w-4 h-4 text-[var(--text-secondary)]" /> MCP SPECS
              </Link>
            </div>
          </div>
          
          {/* Image Content (At the bottom on mobile) */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end order-2">
             <img 
               src="/orch_bg.png" 
               alt="Orch Platform Interface" 
               className="w-full h-auto max-w-full lg:max-w-[120%] object-contain"
             />
          </div>
        </section>

        {/* NEW SECTION: MISSION STATEMENT (Moved down from Hero) */}
        <section className="max-w-4xl mx-auto text-center space-y-6 pt-12 sm:pt-16">
          <p className="text-lg sm:text-xl lg:text-2xl text-[var(--text-primary)] leading-relaxed font-medium">
            The AI Staff Engineer that never sleeps. Orch is the central control plane for software governance. Define Policy-as-Code once, and Orch enforces it across any language—injecting constraints into any AI Agent or IDE and auditing PRs at the GitHub boundary.
          </p>
        </section>

        {/* NEW SECTION: INTERACTIVE POLICY ENGINE */}
        <section className="space-y-8 max-w-5xl mx-auto w-full pt-12 sm:pt-16">
          <div className="text-center space-y-2">
             <h2 className="text-2xl font-bold font-mono text-[var(--text-primary)]">See Orch in Action</h2>
             <p className="text-sm text-[var(--text-secondary)] font-mono">Live Policy Interception & Remediation</p>
          </div>
          
          <div className="space-y-4 w-full">
            {/* Rule Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--border)] no-scrollbar">
              {INTERACTIVE_EXAMPLES.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => setActiveTab(i)}
                  className={`px-3.5 py-2 rounded-t-md text-xs font-mono transition-colors cursor-pointer border-t border-x whitespace-nowrap ${
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
              <div className="px-4 sm:px-5 py-3 bg-[var(--background)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
                  <span>RULE:</span>
                  <span className="text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded border border-[var(--accent)]/20 text-[11px] sm:text-xs">{currentExample.rule}</span>
                </div>
                <span className="text-[var(--text-secondary)] text-[11px] hidden sm:inline">{currentExample.description}</span>
              </div>

              {/* Side-by-side Diffs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
                
                {/* Left: Unsafe Code */}
                <div className="p-4 sm:p-5 space-y-3 bg-[var(--surface)]">
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-semibold"><ShieldAlert className="w-3.5 h-3.5" /> AI Draft</span>
                    <span className="text-[10px] text-rose-500 dark:text-rose-400 font-mono">BLOCKED</span>
                  </div>
                  <pre className="p-3.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[11px] sm:text-xs font-mono font-medium text-rose-700 dark:text-rose-300 leading-relaxed whitespace-pre-wrap break-all shadow-inner">
                    {currentExample.unsafe}
                  </pre>
                </div>

                {/* Right: Enforced Code */}
                <div className="p-4 sm:p-5 space-y-3 bg-[var(--surface)]">
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Remediated</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">PASSED</span>
                  </div>
                  <pre className="p-3.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[11px] sm:text-xs font-mono font-medium text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-all shadow-inner">
                    {currentExample.remediated}
                  </pre>
                </div>
              </div>

              <div className="px-4 sm:px-5 py-2.5 bg-[var(--background)] border-t border-[var(--border)] flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[var(--text-secondary)]">
                <span>Intercepted at commit boundary</span>
                <span className="text-[var(--text-primary)]">Latency: 0.4ms</span>
              </div>
            </div>
          </div>
        </section>

        {/* PIPELINE BLUEPRINT SECTION */}
        <section className="space-y-8 sm:space-y-10 border-t border-[var(--border)] pt-12 sm:pt-16">
          <div className="space-y-2 text-left">
            <span className="text-xs font-mono text-[var(--accent)] font-semibold uppercase tracking-wider">PIPELINE ARCHITECTURE</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-mono">
              Four Layers of Code Governance
            </h2>
          </div>

          {/* 4 Step Interactive Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {PIPELINE_LAYERS.map((layer, i) => (
              <button
                key={layer.step}
                onClick={() => setActiveLayer(i)}
                className={`p-5 sm:p-6 rounded-xl border text-left transition-all cursor-pointer space-y-4 relative ${
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
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between text-xs font-mono border-b border-[var(--border)] pb-4">
              <span className="text-[var(--text-primary)] font-bold font-mono">LAYER {currentLayer.step}: {currentLayer.title}</span>
              <span className="text-[var(--text-secondary)] font-mono text-[10px] sm:text-xs">{currentLayer.tag}</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
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
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5 text-xs font-mono text-[var(--text-primary)] overflow-x-auto">
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

        {/* MARKETPLACE SECTION */}
        <section className="space-y-8 sm:space-y-10 border-t border-[var(--border)] pt-12 sm:pt-16">
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <span className="text-xs font-mono text-[var(--accent)] font-semibold uppercase tracking-wider">THE ECOSYSTEM</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-mono">
              Marketplace for AI Skills
            </h2>
            <p className="text-sm text-[var(--text-secondary)] font-mono mt-4 leading-relaxed">
              Don't write rules from scratch. Subscribe to community-verified policies. When a framework updates, the community updates the skill, and your IDE gets the new rules instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {MARKETPLACE_SKILLS.map((skill, i) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50 transition-all shadow-sm hover:shadow-xl relative overflow-hidden flex flex-col h-full"
              >
                {/* Header: Publisher & Badge */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
                      <Layers className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">{skill.author}</span>
                      <span className="text-xs font-bold font-mono flex items-center gap-1">
                        {skill.id.split('/')[1]}
                        <CheckCircle2 className="w-3 h-3 text-blue-500" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] font-sans">{skill.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans line-clamp-3">
                    {skill.description}
                  </p>
                </div>

                {/* Footer: Downloads & CTA */}
                <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">{skill.downloads} installs</span>
                  <button className="text-[10px] font-bold font-mono px-3 py-1.5 rounded bg-[var(--background)] border border-[var(--border)] group-hover:bg-[var(--accent)] group-hover:text-[var(--primary-foreground)] group-hover:border-[var(--accent)] transition-colors">
                    Subscribe
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="flex justify-center mt-8">
             <Link href={ctaHref} className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 border-b border-dashed border-[var(--text-secondary)] pb-1 hover:border-[var(--text-primary)] transition-colors cursor-pointer">
               Explore all 500+ Verified Skills <ArrowRight className="w-3.5 h-3.5" />
             </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-10 sm:py-12 text-center text-xs font-mono text-[var(--text-secondary)] space-y-2">
        <div className="flex items-center justify-center font-bold text-[var(--text-primary)] text-base tracking-tight">
          Orch
        </div>
        <p>© {new Date().getFullYear()} Orch Inc. Centralized Policy-as-Code Engine.</p>
      </footer>
    </div>
  )
}
