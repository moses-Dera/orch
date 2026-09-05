"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useUser } from "@clerk/nextjs"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { api } from "@/lib/api"
import {
  Server, Cpu, Database, Activity, ShieldCheck,
  Layers, Users, Building2, Radio, CheckCircle2,
  AlertTriangle, Clock, RefreshCw, Lock
} from "lucide-react"

const PLATFORM_ADMIN_EMAIL = "okonkwomoses158@gmail.com"

export default function PlatformOpsPage() {
  const { user, isLoaded } = useUser()
  const [activeTab, setActiveTab] = useState<"infrastructure" | "tenants" | "gateway">("infrastructure")

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ""
  const isPlatformOwner = userEmail === PLATFORM_ADMIN_EMAIL

  const { data: ops, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["platform-ops"],
    queryFn: api.getPlatformOps,
    enabled: isLoaded && isPlatformOwner,
    refetchInterval: 15000, // Live poll every 15s
  })

  if (!isLoaded || (isPlatformOwner && isLoading)) {
    return <PageSkeleton />
  }

  // Access Denied guard for non-platform owners
  if (!isPlatformOwner) {
    return (
      <PageShell
        title="Platform Control Center"
        description="Global system observability and fleet infrastructure."
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center max-w-lg mx-auto my-12">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Restricted to Platform Owner</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
            This root control room is strictly reserved for the Orch platform operator (<code className="text-xs font-mono">{PLATFORM_ADMIN_EMAIL}</code>).
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-4">
            If you are looking for your workspace monitoring, visit the <a href="/analytics" className="text-[var(--accent)] hover:underline">Ops & Analytics</a> tab.
          </p>
        </div>
      </PageShell>
    )
  }

  const vitals = ops?.vitals || {}
  const fleet = ops?.fleet || {}
  const gateway = ops?.gateway || {}
  const queue = ops?.queue || {}
  const organizations = ops?.organizations || []

  const formatUptime = (sec: number) => {
    if (!sec) return "0s"
    const d = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m ${sec % 60}s`
  }

  return (
    <PageShell
      title="Platform Control Center"
      description="Live fleet telemetry, infrastructure vitals, multi-tenant directory, and asynchronous job queue health."
    >
      <div className="space-y-6">

        {/* ─── LIVE REFRESH TOOLBAR ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] p-3 sm:px-4 sm:py-3 rounded-xl">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Core Fleet Online
            </span>
            <span className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)]">
              {vitals.bun_version || "Bun 1.3"}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {vitals.db_latency_ms}ms DB ping
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-secondary)]">
              Polled every 15s
            </span>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Refresh Fleet Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ─── TOP KPI STATS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Tenants */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 transition-all hover:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Total Organizations</p>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {fleet.total_organizations}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {fleet.total_teams} active teams across all tenants
            </p>
          </div>

          {/* Registered Users */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 transition-all hover:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Registered Developers</p>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {fleet.total_users}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              Authenticated developer accounts
            </p>
          </div>

          {/* Protected Repositories / Projects */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 transition-all hover:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Protected Projects</p>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {fleet.total_projects}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {fleet.total_constraints} active rule sets enforced
            </p>
          </div>

          {/* Core API Uptime */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 transition-all hover:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Core Uptime</p>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {formatUptime(vitals.uptime_seconds)}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              RSS: {vitals.memory_rss_mb} MB | Heap: {vitals.memory_heap_used_mb} MB
            </p>
          </div>
        </div>

        {/* ─── NAVIGATION TABS ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs font-medium overflow-x-auto scrollbar-none flex-nowrap shrink-0">
          <button
            onClick={() => setActiveTab("infrastructure")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "infrastructure"
                ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20 shadow-xs"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Infrastructure & Queue</span>
          </button>
          <button
            onClick={() => setActiveTab("tenants")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "tenants"
                ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20 shadow-xs"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Tenant Directory ({organizations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("gateway")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "gateway"
                ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20 shadow-xs"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>AI Gateway & Trial Fleet</span>
          </button>
        </div>

        {/* ─── TAB 1: INFRASTRUCTURE & ASYNC QUEUE ───────────────────────────── */}
        {activeTab === "infrastructure" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* System Vitals Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Runtime & Memory Vitals</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Core Bun API daemon metrics</p>
              </div>
              <div className="p-5 space-y-4 text-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]/50">
                  <span className="text-[var(--text-secondary)]">Runtime Engine</span>
                  <span className="font-mono text-xs">{vitals.bun_version} (Node compat {vitals.node_version})</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]/50">
                  <span className="text-[var(--text-secondary)]">Environment</span>
                  <span className="font-mono text-xs uppercase text-emerald-400">{vitals.environment}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]/50">
                  <span className="text-[var(--text-secondary)]">Process Resident Memory (RSS)</span>
                  <span className="font-mono text-xs font-semibold">{vitals.memory_rss_mb} MB</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]/50">
                  <span className="text-[var(--text-secondary)]">V8 Heap Allocation</span>
                  <span className="font-mono text-xs">{vitals.memory_heap_used_mb} MB / {vitals.memory_heap_total_mb} MB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Database Pool Ping (Supabase AWS)</span>
                  <span className="font-mono text-xs text-emerald-400 font-semibold">{vitals.db_latency_ms} ms</span>
                </div>
              </div>
            </div>

            {/* PostgreSQL Job Queue Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">PostgreSQL Job Queue</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Zero-extra-infra async processing backlog</p>
                </div>
                <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)]">
                  {queue.total} total jobs
                </span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Queued Backlog</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">{queue.queued}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Waiting for worker lock</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">In-Flight Processing</p>
                  <p className="text-xl font-bold text-sky-400 mt-1">{queue.processing}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">SKIP LOCKED active</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Completed Successfully</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{queue.completed}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Executed tasks</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3.5">
                  <p className="text-xs text-[var(--text-secondary)]">Failed After Retries</p>
                  <p className="text-xl font-bold text-rose-400 mt-1">{queue.failed}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Max attempts reached</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: TENANT DIRECTORY ───────────────────────────────────────── */}
        {activeTab === "tenants" && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Registered Organizations</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Active tenant organizations provisioned across the platform.
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {organizations.map((org: any) => (
                <div key={org.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 hover:bg-[var(--surface-hover)] transition-colors gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                      {org.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{org.name}</p>
                      <p className="text-xs font-mono text-[var(--text-secondary)]">ID: {org.id}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 3: AI GATEWAY & TRIAL FLEET ───────────────────────────────── */}
        {activeTab === "gateway" && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden p-5 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Gateway Trial Fleet Status</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Configuration and throughput for developers chatting without custom BYOK keys.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-xs text-[var(--text-secondary)]">Active Trial Provider</p>
                <p className="text-base font-bold text-[var(--text-primary)] mt-1 uppercase">{gateway.trial_provider}</p>
                <p className="text-[11px] text-emerald-400 mt-1">Configured & Online</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-xs text-[var(--text-secondary)]">Trial Model Routing</p>
                <p className="text-xs font-mono font-semibold text-[var(--accent)] mt-1 truncate">{gateway.trial_model}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">11B Vision & Instruction</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-xs text-[var(--text-secondary)]">Total Monitored Sessions</p>
                <p className="text-base font-bold text-[var(--text-primary)] mt-1">{fleet.total_sessions}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">Across all workspace chats</p>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 space-y-2">
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Upstream Endpoint</p>
              <code className="text-xs font-mono text-[var(--text-primary)] block break-all bg-[var(--surface)] p-2.5 rounded border border-[var(--border)]">
                {gateway.trial_api_url}
              </code>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  )
}
