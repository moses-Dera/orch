"use client"

import { useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { StatCard } from "@/components/shared/StatCard"
import { HealthBadge } from "@/components/shared/HealthBadge"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { useOrchStatus, useHealth, useAuditLog, useModels } from "@/hooks/useOrchStatus"
import { useHasAccess } from "@/hooks/useRole"
import { formatTokens, formatDate } from "@/lib/utils"

function ChecklistItem({
  done, label, description, action, href,
}: {
  done: boolean
  label: string
  description: string
  action?: string
  href?: string
}) {
  const router = useRouter()
  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
        done ? "bg-green-500 text-white" : "border-2 border-[var(--border)] text-[var(--text-secondary)]"
      }`}>
        {done ? "✓" : ""}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "line-through text-[var(--text-secondary)]" : ""}`}>{label}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>
      </div>
      {!done && action && href && (
        <button
          onClick={() => router.push(href)}
          className="shrink-0 text-xs font-medium text-[var(--accent)] hover:underline"
        >
          {action} →
        </button>
      )}
    </div>
  )
}

export default function HomePage() {
  const { data: status, isLoading } = useOrchStatus()
  const { data: health } = useHealth()
  const { data: audit } = useAuditLog({ limit: 10 })
  const { data: models } = useModels()
  const isAdmin = useHasAccess("admin")

  if (isLoading) return <PageSkeleton />

  const hasModels = (models?.models.length ?? 0) > 0
  const hasSessions = (audit?.total_sessions ?? 0) > 0
  const isNew = !hasSessions

  return (
    <PageShell
      title={`Welcome${status ? ` to ${status.org}` : ""}`}
      description={status ? `${status.team} · ${status.model_policy} policy` : ""}
    >

      {/* Getting started checklist — shown when team has no activity yet */}
      {isNew && isAdmin && (
        <div className="rounded-lg border bg-[var(--surface)]">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-medium">Getting started</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Complete these steps to get your team up and running.
            </p>
          </div>
          <div className="divide-y">
            <ChecklistItem
              done={true}
              label="Create your org"
              description="Your org and team are set up."
            />
            <ChecklistItem
              done={hasModels}
              label="Add your first AI model"
              description="Connect your team's AI provider — OpenAI, Anthropic, Gemini, or your own."
              action="Add model"
              href="/models"
            />
            <ChecklistItem
              done={true}
              label="Review your constraint profiles"
              description="Orch ships with backend, cyber, blockchain, and general profiles. Customize them for your stack."
              action="View constraints"
              href="/constraints"
            />
            <ChecklistItem
              done={false}
              label="Install the VS Code extension"
              description="Developers get Orch's constraints directly in their editor."
              action="View docs"
              href="/docs"
            />
            <ChecklistItem
              done={false}
              label="Invite your team"
              description="Add developers so their sessions are attributed and audited."
              action="Invite members"
              href="/team"
            />
            <ChecklistItem
              done={hasSessions}
              label="Make your first request"
              description="Use the CLI, VS Code extension, or the Chat page to send your first prompt."
              action="Open chat"
              href="/chat"
            />
          </div>
        </div>
      )}

      {/* New non-admin user — simple welcome */}
      {isNew && !isAdmin && status && (
        <div className="rounded-lg border bg-[var(--surface)] p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">You're all set</p>
            <p className="text-sm text-[var(--text-secondary)]">
              You're a <span className="font-medium">{status.team}</span> member at{" "}
              <span className="font-medium">{status.org}</span>.
            </p>
          </div>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <p>→ Use <strong>Chat</strong> to ask questions with your org's constraints applied.</p>
            <p>→ Use <strong>Audit</strong> to review code against your org's standards.</p>
            <p>→ Check <strong>Sessions</strong> to see your conversation history.</p>
            <p>→ Check <strong>Docs</strong> to set up the VS Code extension or CLI.</p>
          </div>
        </div>
      )}

      {/* Active team — stats and activity */}
      {!isNew && (
        <>
          {isAdmin && audit && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total Sessions" value={audit.total_sessions} />
              <StatCard label="Input Tokens" value={formatTokens(audit.total_input_tokens)} />
              <StatCard label="Output Tokens" value={formatTokens(audit.total_output_tokens)} />
              <StatCard
                label="Constraints"
                value={health?.summary.healthy ?? 0}
                sub={`${health?.summary.warning ?? 0} warning · ${health?.summary.critical ?? 0} critical`}
              />
            </div>
          )}

          {isAdmin && health && health.scores.length > 0 && (
            <div className="rounded-lg border bg-[var(--surface)]">
              <div className="px-5 py-4 border-b">
                <h2 className="text-sm font-medium">Constraint Health</h2>
              </div>
              <div className="divide-y">
                {health.scores.map((s) => (
                  <div key={s.constraint_id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{s.constraint_id}</p>
                      {s.recommendation && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.recommendation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono">{s.health_score.toFixed(0)}</span>
                      <HealthBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && audit && audit.sessions.length > 0 && (
            <div className="rounded-lg border bg-[var(--surface)]">
              <div className="px-5 py-4 border-b">
                <h2 className="text-sm font-medium">Recent Activity</h2>
              </div>
              <div className="divide-y">
                {audit.sessions.slice(0, 8).map((s) => (
                  <div key={s.session_id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm">{s.developer.email}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {s.total_messages} messages · {formatTokens(s.total_input_tokens + s.total_output_tokens)} tokens
                      </p>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{formatDate(s.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isAdmin && status && (
            <div className="rounded-lg border bg-[var(--surface)] p-6 space-y-2">
              <p className="text-sm"><span className="text-[var(--text-secondary)]">Org:</span> {status.org}</p>
              <p className="text-sm"><span className="text-[var(--text-secondary)]">Team:</span> {status.team}</p>
              <p className="text-sm"><span className="text-[var(--text-secondary)]">Model policy:</span> {status.model_policy}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-4">Use Chat or Audit to get started.</p>
            </div>
          )}
        </>
      )}

    </PageShell>
  )
}
