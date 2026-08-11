"use client"

import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { api } from "@/lib/api"
import { Activity } from "lucide-react"

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: api.getAnalytics,
  })

  if (isLoading) return <PageSkeleton />

  const stats = data?.stats ?? { total: 0, violations: 0, clean: 0 }
  const recent = data?.recent ?? []

  return (
    <PageShell
      title="Analytics"
      description="Monitor pull request evaluations and constraint enforcement metrics."
    >
      <div className="space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-[var(--surface)] p-5 transition-transform hover:-translate-y-1 hover:shadow-md">
            <p className="text-sm text-[var(--text-secondary)] font-medium">Total PRs Evaluated</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-[var(--surface)] p-5 transition-transform hover:-translate-y-1 hover:shadow-md">
            <p className="text-sm text-[var(--text-secondary)] font-medium">Clean PRs</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--success)]">{stats.clean}</p>
          </div>
          <div className="rounded-lg border bg-[var(--surface)] p-5 transition-transform hover:-translate-y-1 hover:shadow-md">
            <p className="text-sm text-[var(--text-secondary)] font-medium">Violations Caught</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--critical)]">{stats.violations}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border bg-[var(--surface)]">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-medium">Recent Evaluations</h2>
          </div>
          
          {recent.length === 0 ? (
            <EmptyState 
              icon={Activity}
              title="No data yet" 
              description="Once Orch evaluates a Pull Request, it will appear here." 
            />
          ) : (
            <div className="divide-y">
              {recent.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between px-5 py-4 hover:bg-[var(--muted)] transition-colors">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded-sm bg-[var(--border)] text-[var(--foreground)]">
                        PR #{ev.pullRequestNumber}
                      </span>
                      <span className="text-sm font-medium">{ev.projectName}</span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {new Date(ev.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    {ev.status === "CLEAN" ? (
                      <span className="inline-flex items-center rounded-full bg-[var(--success)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--success)]">
                        Clean
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[var(--critical)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--critical)]">
                        Violation
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </PageShell>
  )
}
