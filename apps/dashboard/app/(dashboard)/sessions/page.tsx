"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { useMe } from "@/hooks/useRole"
import { api } from "@/lib/api"
import { formatDate, formatTokens } from "@/lib/utils"
import type { Session, SessionDetail } from "@/types"

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
      {data.messages.map((m) => (
        <div key={m.id} className={`px-5 py-3 ${m.role === "user" ? "bg-[var(--background)]" : ""}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              {m.role === "user" ? "You" : m.model_used ?? "Assistant"}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{formatDate(m.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
        </div>
      ))}
    </div>
  )
}

export default function SessionsPage() {
  const { data: me } = useMe()
  const [selected, setSelected] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => api.mySessions(),
    enabled: !!me,
    staleTime: 60_000,
  })

  if (isLoading) return <PageSkeleton />

  const sessions = data?.sessions ?? []

  return (
    <PageShell title="Sessions" description="Your conversation history.">
      {sessions.length === 0 ? (
        <div className="rounded-lg border bg-[var(--surface)] p-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">No sessions yet. Start a chat to see your history here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[280px_1fr] gap-4" style={{ height: "calc(100vh - 200px)" }}>

          {/* Session list */}
          <div className="rounded-lg border bg-[var(--surface)] overflow-y-auto">
            <div className="px-4 py-3 border-b">
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{sessions.length} sessions</p>
            </div>
            <div className="divide-y">
              {sessions.map((s) => (
                <button
                  key={s.session_id}
                  onClick={() => setSelected(s.session_id)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-[var(--border)] ${
                    selected === s.session_id ? "bg-[var(--accent)]/5 border-l-2 border-l-[var(--accent)]" : ""
                  }`}
                >
                  <p className="text-xs font-mono text-[var(--text-secondary)]">{s.session_id.slice(0, 8)}...</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {s.total_messages} msgs · {formatTokens(s.total_input_tokens + s.total_output_tokens)} tokens
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatDate(s.created_at)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Message thread */}
          <div className="rounded-lg border bg-[var(--surface)] overflow-y-auto">
            {!selected ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-[var(--text-secondary)]">Select a session to view the conversation.</p>
              </div>
            ) : (
              <SessionThread sessionId={selected} />
            )}
          </div>

        </div>
      )}
    </PageShell>
  )
}
