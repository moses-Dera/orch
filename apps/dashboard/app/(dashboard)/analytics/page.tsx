"use client"

import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { useAuditLog } from "@/hooks/useOrchStatus"
import { formatTokens } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from "recharts"

const COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"]

export default function AnalyticsPage() {
  const { data, isLoading } = useAuditLog({ limit: 200 })

  if (isLoading) return <PageSkeleton />

  const devData = data?.developer_breakdown.map((d) => ({
    name: d.email.split("@")[0],
    tokens: d.total_input_tokens + d.total_output_tokens,
    sessions: d.sessions,
  })) ?? []

  const totalTokens = (data?.total_input_tokens ?? 0) + (data?.total_output_tokens ?? 0)

  return (
    <PageShell title="Analytics" description="Usage and token breakdown across your team.">
      <div className="space-y-6">

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Sessions" value={data?.total_sessions ?? 0} />
          <StatCard label="Total Tokens" value={formatTokens(totalTokens)} />
          <StatCard label="Active Developers" value={devData.length} />
        </div>

        {devData.length === 0 ? (
          <EmptyState title="No data yet" description="Usage data will appear here once your team starts using Orch." />
        ) : (
          <>
            <div className="rounded-lg border bg-[var(--surface)] p-5">
              <h2 className="text-sm font-medium mb-4">Token Usage by Developer</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={devData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatTokens(v)} />
                  <Tooltip formatter={(v: number) => formatTokens(v)} />
                  <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                    {devData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg border bg-[var(--surface)] p-5">
              <h2 className="text-sm font-medium mb-4">Sessions by Developer</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={devData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                    {devData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

      </div>
    </PageShell>
  )
}
