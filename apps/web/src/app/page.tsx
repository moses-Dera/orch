"use client"

import { motion } from "framer-motion"
import { Shield, Zap, Terminal, GitMerge, ArrowRight, Github, Lock } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--color-accent)] selection:text-white overflow-hidden relative">
      
      {/* Abstract Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-[var(--color-border)] glass z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <Shield className="text-[var(--color-accent)] w-6 h-6" />
          Orch
        </div>
        <div className="flex items-center gap-6">
          <Link href="http://localhost:3000" className="text-sm font-medium hover:text-[var(--color-accent)] transition-colors">
            Login
          </Link>
          <Link href="http://localhost:3000/onboarding" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
            Start 100k Token Trial
          </Link>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20 px-6 lg:px-12 max-w-7xl mx-auto">
        
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center space-y-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium text-[var(--color-text-secondary)]"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
            Orch v3 is now live
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-bold tracking-tighter leading-tight max-w-4xl"
          >
            One Rulebook. <br className="hidden sm:block" />
            <span className="text-gradient">Complete AI Governance.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-[var(--color-text-secondary)] max-w-2xl"
          >
            Orch is the central brain for your engineering standards. Define your Policy as Code once. Orch uses it to guide developers in their IDE, and guards your codebase at the GitHub PR boundary.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-4 pt-4"
          >
            <Link href="http://localhost:3000/onboarding" className="flex items-center gap-2 bg-[var(--color-accent)] text-black font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity">
              Connect GitHub <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="http://localhost:3000" className="flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-white font-medium px-6 py-3 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors">
              <Terminal className="w-4 h-4" /> View Docs
            </Link>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section className="py-32 grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Terminal className="w-6 h-6 text-emerald-400" />}
            title="Perfect Code, First Try"
            description="For Developers: The local Orch MCP server secretly injects your org's rules into Cursor and Claude. Stop wasting time writing prompts—the AI already knows your stack."
          />
          <FeatureCard 
            icon={<GitMerge className="w-6 h-6 text-blue-400" />}
            title="End PR Burnout"
            description="For Senior Engineers: Orch is your Automated Staff Engineer. It semantically reviews every PR and blocks bad code before a human even has to look at it."
          />
          <FeatureCard 
            icon={<Shield className="w-6 h-6 text-rose-400" />}
            title="The Ultimate Safety Net"
            description="For the CTO: Sleep well at night. Guarantee that no AI-generated code reaches production if it violates your security policies or architectural standards."
          />
        </section>

        {/* MCP Terminal Section */}
        <section className="py-20 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tighter">
              Policy as Code, <br />
              <span className="text-[var(--color-text-secondary)]">Powered by MCP.</span>
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)]">
              Orch isn't just a dashboard. Install the Orch CLI and launch the local MCP server. Your favorite AI IDEs (Cursor, Claude Desktop) can fetch your company's active constraints directly from our API in real-time.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">✓</div>
                Auto-syncs to .cursorrules
              </li>
              <li className="flex items-center gap-3 text-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">✓</div>
                AI dynamically pushes new rules via API
              </li>
            </ul>
          </div>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 blur-3xl" />
            <div className="relative rounded-2xl border border-[var(--color-border)] bg-[#0d0d0d] overflow-hidden font-mono text-sm shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[#141414]">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-[var(--color-text-secondary)]">orch mcp</span>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-[var(--color-text-secondary)]">$ orch mcp</p>
                <p className="text-white">🚀 Orch MCP Server is running and listening on stdio</p>
                <p className="text-[var(--color-text-secondary)]">Waiting for IDE connection...</p>
                <p className="text-emerald-400">← Received: list_tools</p>
                <p className="text-emerald-400">← Received: call_tool (fetch_policy)</p>
                <p className="text-blue-400">→ Sent: 12 active constraints</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-text-secondary)]">
        <div className="flex items-center justify-center gap-2 font-bold text-white mb-4">
          <Shield className="w-5 h-5 text-[var(--color-accent)]" /> Orch
        </div>
        <p>© 2026 Orch Inc. All rights reserved.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors group"
    >
      <div className="w-12 h-12 rounded-xl bg-black border border-[var(--color-border)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-[var(--color-text-secondary)] leading-relaxed">
        {description}
      </p>
    </motion.div>
  )
}
