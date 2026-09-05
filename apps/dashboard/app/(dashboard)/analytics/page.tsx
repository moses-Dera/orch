"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { api } from "@/lib/api"
import {
  Activity, ShieldCheck, AlertTriangle, Cpu,
  CheckCircle2, Flame, Layers, Clock
} from "lucide-react"

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"evaluations" | "tokens" | "health">("evaluations")

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: api.getAnalytics,
  })

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => api.auditLog({ limit: 50 }),
  })

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["health-scores"],
    queryFn: api.health,
  })

  const isLoading = analyticsLoading || auditLoading || healthLoading

  if (isLoading) return <PageSkeleton />

  const stats = analyticsData?.stats ?? { total: 0, violations: 0, clean: 0 }
  const recentEvals = analyticsData?.recent ?? []
  const audit = auditData ?? { org: "default", total_sessions: 0, total_input_tokens: 0, total_output_tokens: 0, developer_breakdown: [], sessions: [] }
  const healthScores = healthData?.scores ?? []
  const healthSummary = healthData?.summary ?? { total_constraints: 0, healthy: 0, warning: 0, critical: 0 }

  const passRate = stats.total > 0 ? Math.round((stats.clean / stats.total) * 100) : 100
  const totalTokens = (audit.total_input_tokens || 0) + (audit.total_output_tokens || 0)

  return (
    <PageShell
      title="Ops & Monitoring"
      description="Live telemetry, pull request compliance evaluations, and AI token monitoring across your workspace."
    >
      <div className="space-y-6">

        {/* ─── TOP KPI STATS ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* PR Pass Rate */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 transition-all hover:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-secondary)]">PR Pass Rate</p>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {passRate}%
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {stats.clean} clean of {stats.total} evaluated PRs
            </p>
          </div>

          {/* Violations Intercepted */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 transition-all hover:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Violations Blocked</p>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-rose-400">
              {stats.violations}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              Sentinel intercepted unsafe code
            </p>
          </div>

          {/* Monitored AI Sessions */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 transition-all hover:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-secondary)]">AI Sessions</p>
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {audit.total_sessions}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              Attributed developer interactions
            </p>
          </div>

          {/* Total Token Telemetry */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 transition-all hover:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Tokens Monitored</p>
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {totalTokens.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {audit.total_input_tokens.toLocaleString()} in / {audit.total_output_tokens.toLocaleString()} out
            </p>
          </div>
        </div>

        {/* ─── NAVIGATION TABS ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs font-medium overflow-x-auto scrollbar-none flex-nowrap shrink-0">
          <button
            onClick={() => setActiveTab("evaluations")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "evaluations"
                ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20 shadow-xs"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ShieldCheck size={14} />
            <span>PR Evaluations ({stats.total})</span>
          </button>
          <button
            onClick={() => setActiveTab("tokens")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "tokens"
                ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20 shadow-xs"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Flame size={14} />
            <span>Token Telemetry ({audit.sessions.length} logs)</span>
          </button>
          <button
            onClick={() => setActiveTab("health")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "health"
                ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20 shadow-xs"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Layers size={14} />
            <span>Constraint Health ({healthSummary.total_constraints})</span>
          </button>
        </div>

        {/* ─── TAB 1: PR EVALUATIONS ───────────────────────────────────────────── */}
        {activeTab === "evaluations" && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sentinel Pull Request Evaluations</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Real-time log of pull requests evaluated against active architectural rules.
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)]">
                Live Feed
              </span>
            </div>

            {recentEvals.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No Pull Request evaluations yet"
                description="Connect your GitHub App in Settings → GitHub and open a pull request to trigger the AI Sentinel."
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {recentEvals.map((ev: any) => (
                  <div key={ev.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 hover:bg-[var(--surface-hover)] transition-colors gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]">
                          PR #{ev.pullRequestNumber}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">{ev.projectName}</span>
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(ev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      {ev.status === "CLEAN" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 size={12} />
                          Clean (Passed)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
                          <AlertTriangle size={12} />
                          Violation Flagged
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: TOKEN OPS & AI GATEWAY TELEMETRY ──────────────────────────── */}
        {activeTab === "tokens" && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Gateway Telemetry & Audit Log</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Detailed consumption per developer session and token throughput.
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)]">
                Org: {audit.org}
              </span>
            </div>

            {audit.sessions.length === 0 ? (
              <EmptyState
                icon={Cpu}
                title="No AI token sessions recorded"
                description="Developer sessions through the CLI, IDE Extension, or Chat will log token telemetry here."
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {audit.sessions.map((s: any) => (
                  <div key={s.session_id} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 hover:bg-[var(--surface-hover)] transition-colors gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                          {s.developer?.email || "developer"}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                          {s.developer?.role || "member"}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(s.created_at).toLocaleString()} • {s.total_messages} msgs
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-secondary)]">
                      <span className="text-emerald-400 font-semibold">
                        +{(s.total_input_tokens + s.total_output_tokens).toLocaleString()} tokens
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] hidden sm:inline">
                        ({s.total_input_tokens} in / {s.total_output_tokens} out)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: CONSTRAINT HEALTH SCORES ──────────────────────────────────── */}
        {activeTab === "health" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <p className="text-xs text-[var(--text-secondary)]">Total Active Rules</p>
                <p className="text-xl font-bold mt-1 text-[var(--text-primary)]">{healthSummary.total_constraints}</p>
              </div>
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-xs text-emerald-400 font-medium">Healthy Constraints</p>
                <p className="text-xl font-bold mt-1 text-emerald-400">{healthSummary.healthy}</p>
              </div>
              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <p className="text-xs text-rose-400 font-medium">Needs Review</p>
                <p className="text-xl font-bold mt-1 text-rose-400">{healthSummary.critical + healthSummary.warning}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Constraint Health & Compliance Status</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Calculated from developer adherence and manual override telemetry.
                </p>
              </div>

              {healthScores.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No constraints configured"
                  description="Configure custom constraints or subscribe to verified marketplace packs to start tracking health."
                />
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {healthScores.map((h: any) => (
                    <div key={h.constraint_id} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 hover:bg-[var(--surface-hover)] transition-colors gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{h.constraint_id}</span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {h.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {h.total_requests} requests evaluated • {h.override_rate}% override rate
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-[var(--background)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                          <div
                            className="bg-emerald-400 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(h.health_score, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-[var(--text-primary)] w-10 text-right">
                          {Math.round(h.health_score)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </PageShell>
  )
}
