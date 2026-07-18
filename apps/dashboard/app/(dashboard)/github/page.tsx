"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { StatCard } from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import { useMe } from "@/hooks/useRole"
import { apiFetch, api } from "@/lib/api"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface Installation {
  id: string
  installation_id: number
  github_org: string
  repos: string[]
  repos_count: number
  workflow_committed: boolean
  installed_at: string
}

export default function GitHubPage() {
  const { data: me } = useMe()
  const queryClient = useQueryClient()
  const orgId = me?.org?.id

  const { data, isLoading } = useQuery({
    queryKey: ["github-installations", orgId],
    queryFn: () => apiFetch<{ installations: Installation[] }>(
      `/v1/github/installations?org_id=${orgId}`
    ),
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const { data: coverage } = useQuery({
    queryKey: ["github-coverage"],
    queryFn: api.coverage,
    enabled: !!orgId,
    staleTime: 60_000,
  })

  const disconnect = useMutation({
    mutationFn: (id: string) => apiFetch(
      `/v1/github/installations/${id}?org_id=${orgId}`,
      { method: "DELETE" }
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-installations"] })
      toast.success("GitHub org disconnected")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const installations = data?.installations ?? []
  const isConnected = installations.length > 0
  const appInstallUrl = `https://github.com/apps/orch-code-review/installations/new?state=${orgId}`

  if (isLoading) return <PageSkeleton />

  return (
    <PageShell
      title="GitHub"
      description="Connect your GitHub org to automatically review every PR."
    >
      <div className="space-y-6 max-w-2xl">

        {/* Connection status */}
        <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium">GitHub App</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {isConnected
                  ? "Connected — every PR in your org is reviewed automatically."
                  : "Not connected — install the GitHub App to activate automatic PR reviews."}
              </p>
            </div>
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-[var(--success)]" : "bg-[var(--border)]"}`} />
          </div>

          {!isConnected && (
            <div className="space-y-3">
              <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                {[
                  "Adds the Orch review workflow to every repo in your org",
                  "Reviews every PR automatically — no developer action required",
                  "Covers new repos as they are created",
                  "Posts findings as inline PR comments with exact line numbers",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[var(--accent)] shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button onClick={() => window.open(appInstallUrl, "_blank")}>
                Install GitHub App →
              </Button>
            </div>
          )}
        </div>

        {/* Coverage metrics — shown when connected */}
        {isConnected && coverage && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Repos Covered" value={coverage.repos_covered} />
              <StatCard label="Reviews (30d)" value={coverage.reviews_last_30_days} />
              <StatCard label="All-Time Reviews" value={coverage.total_reviews_all_time} />
              <StatCard label="Active Devs (30d)" value={coverage.active_developers_last_30_days} />
            </div>

            <div className="rounded-lg border bg-[var(--surface)] p-5">
              <h2 className="text-sm font-medium mb-4">PR Reviews — Last 30 Days</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={coverage.daily_chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => d.slice(5)} // show MM-DD only
                    interval={6}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: number) => [v, "Reviews"]}
                    labelFormatter={(l) => l}
                  />
                  <Bar dataKey="reviews" radius={[3, 3, 0, 0]}>
                    {coverage.daily_chart.map((_, i) => (
                      <Cell key={i} fill="var(--accent)" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Connected installations */}
        {installations.map((inst) => (
          <div key={inst.id} className="rounded-lg border bg-[var(--surface)]">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{inst.github_org}</p>
                  {inst.workflow_committed && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {inst.repos_count} repo{inst.repos_count !== 1 ? "s" : ""} covered · Connected {formatDate(inst.installed_at)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => disconnect.mutate(inst.id)}
                disabled={disconnect.isPending}
              >
                Disconnect
              </Button>
            </div>
            <div className="divide-y max-h-64 overflow-y-auto">
              {inst.repos.map((repo) => (
                <div key={repo} className="flex items-center justify-between px-5 py-2.5">
                  <p className="text-sm font-mono text-[var(--text-secondary)]">{repo}</p>
                  <span className="text-xs text-[var(--success)]">✓ covered</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Secrets setup */}
        <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-3">
          <h2 className="text-sm font-medium">Repository Secrets</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Add these to your GitHub org once — all repos inherit them automatically.
          </p>
          <div className="space-y-2">
            {[
              { name: "ORCH_API_KEY", value: me?.api_key ?? "orch_xxx", desc: "Your Orch API key" },
              { name: "ORCH_API_URL", value: "https://your-orch-instance.com", desc: "Your Orch API URL" },
            ].map((s) => (
              <div key={s.name} className="rounded-md border bg-[var(--background)] p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono font-medium">{s.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{s.desc}</p>
                </div>
                <code className="text-xs text-[var(--text-secondary)] font-mono break-all">{s.value}</code>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            GitHub Org → Settings → Secrets → Actions → New org secret
          </p>
        </div>

      </div>
    </PageShell>
  )
}
