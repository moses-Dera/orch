"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { StatCard } from "@/components/shared/StatCard"
import { useAuditLog } from "@/hooks/useOrchStatus"
import { api } from "@/lib/api"
import { formatDate, formatTokens } from "@/lib/utils"
import type { DeveloperStat, Session } from "@/types"

function SessionThread({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.session(sessionId),
    staleTime: 60_000,
  })

  if (isLoading) return <div className="p-4 text-sm text-[var(--text-secondary)]">Loading...</div>
  if (!data) return null

  return (
    <div className="divide-y">
      <div className="px-5 py-3 border-b bg-[var(--background)]">
        <p className="text-xs font-mono text-[var(--text-secondary)]">{sessionId}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          {data.messages.length} messages · {data.models_used.join(", ")}
        </p>
      </div>
      {data.messages.map((m) => (
        <div key={m.id} className={`px-5 py-3 ${m.role === "user" ? "bg-[var(--background)]" : ""}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              {m.role === "user" ? data.developer.name ?? data.developer.email : m.model_used ?? "Assistant"}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{formatDate(m.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
          {m.role !== "user" && (m.input_tokens > 0 || m.output_tokens > 0) && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {formatTokens(m.input_tokens)} in · {formatTokens(m.output_tokens)} out
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function DevSessions({ dev, sessions }: { dev: DeveloperStat; sessions: Session[] }) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const devSessions = sessions.filter(s => s.developer.member_id === dev.member_id)

  return (
    <div className="grid grid-cols-[240px_1fr] gap-0 h-full">
      {/* Session list */}
      <div className="border-r overflow-y-auto">
        <div className="px-4 py-3 border-b bg-[var(--background)]">
          <p className="text-xs font-medium">{dev.name ?? dev.email}</p>
          <p className="text-xs text-[var(--text-secondary)]">{devSessions.length} sessions</p>
        </div>
        <div className="divide-y">
          {devSessions.map((s) => (
            <button
              key={s.session_id}
              onClick={() => setSelectedSession(s.session_id)}
              className={`w-full text-left px-4 py-3 transition-colors hover:bg-[var(--border)] ${
                selectedSession === s.session_id ? "bg-[var(--accent)]/5 border-l-2 border-l-[var(--accent)]" : ""
              }`}
            >
              <p className="text-xs font-mono text-[var(--text-secondary)]">{s.session_id.slice(0, 8)}...</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {s.total_messages} msgs · {formatTokens(s.total_input_tokens + s.total_output_tokens)} tokens
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{formatDate(s.created_at)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="overflow-y-auto">
        {!selectedSession ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--text-secondary)]">Select a session to read the conversation.</p>
          </div>
        ) : (
          <SessionThread sessionId={selectedSession} />
        )}
      </div>
    </div>
  )
}

export default function AuditLogPage() {
  const { data, isLoading } = useAuditLog({ limit: 100 })
  const [selectedDev, setSelectedDev] = useState<DeveloperStat | null>(null)

  if (isLoading) return <PageSkeleton />

  return (
    <PageShell title="Audit Log" description="Full session history with per-developer attribution.">
      <div className="space-y-6">

        {data && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Sessions" value={data.total_sessions} />
            <StatCard label="Input Tokens" value={formatTokens(data.total_input_tokens)} />
            <StatCard label="Output Tokens" value={formatTokens(data.total_output_tokens)} />
          </div>
        )}

        {data && data.developer_breakdown.length > 0 && (
          <div className="rounded-lg border bg-[var(--surface)]" style={{ height: selectedDev ? "calc(100vh - 320px)" : "auto" }}>

            {/* Developer list */}
            {!selectedDev ? (
              <>
                <div className="px-5 py-4 border-b">
                  <h2 className="text-sm font-medium">Developers</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Click a developer to see their sessions.</p>
                </div>
                <div className="divide-y">
                  {data.developer_breakdown.map((d) => (
                    <button
                      key={d.email}
                      onClick={() => setSelectedDev(d)}
                      className="w-full text-left flex items-center justify-between px-5 py-3 hover:bg-[var(--border)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-xs font-medium text-[var(--accent)] shrink-0">
                          {(d.name ?? d.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{d.name ?? d.email}</p>
                          {d.name && <p className="text-xs text-[var(--text-secondary)]">{d.email}</p>}
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {d.sessions} sessions · {d.models_used.join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-[var(--text-secondary)] shrink-0">
                        <p>{formatTokens(d.total_input_tokens)} in</p>
                        <p>{formatTokens(d.total_output_tokens)} out</p>
                        <p className="mt-1 text-[var(--accent)]">View sessions →</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Drill-down view */
              <div className="flex flex-col h-full">
                <div className="px-5 py-3 border-b flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setSelectedDev(null)}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    ← All developers
                  </button>
                  <span className="text-[var(--border)]">/</span>
                  <span className="text-sm font-medium">{selectedDev.name ?? selectedDev.email}</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {formatTokens(selectedDev.total_input_tokens + selectedDev.total_output_tokens)} total tokens
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <DevSessions dev={selectedDev} sessions={data.sessions} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* All sessions flat list — shown only when no developer is selected */}
        {!selectedDev && (
          <div className="rounded-lg border bg-[var(--surface)]">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-medium">All Sessions</h2>
            </div>
            {!data || data.sessions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[var(--text-secondary)]">Sessions will appear here once developers start using Orch.</p>
              </div>
            ) : (
              <div className="divide-y">
                {data.sessions.map((s) => (
                  <div key={s.session_id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm">{s.developer.name ?? s.developer.email}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">{s.session_id.slice(0, 12)}...</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-secondary)]">
                        {s.total_messages} msgs · {formatTokens(s.total_input_tokens + s.total_output_tokens)} tokens
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{formatDate(s.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </PageShell>
  )
}
