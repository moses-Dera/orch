"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { HealthBadge } from "@/components/shared/HealthBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { useHealth } from "@/hooks/useOrchStatus"
import { useHasAccess } from "@/hooks/useRole"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { scoreColor } from "@/lib/utils"

const BLANK = {
  id: "", description: "", constraints: "",
  gpt_variant: "", claude_variant: "", gemini_variant: "", version: "1.0",
}

export default function ConstraintsPage() {
  const isAdmin = useHasAccess("admin")
  const queryClient = useQueryClient()
  const { data: health, isLoading: healthLoading } = useHealth()
  const { data: constraintsData, isLoading: constraintsLoading } = useQuery({
    queryKey: ["constraints"],
    queryFn: api.listConstraints,
  })

  const [editing, setEditing] = useState<typeof BLANK | null>(null)
  const [sandboxPrompt, setSandboxPrompt] = useState("")
  const [sandboxResult, setSandboxResult] = useState("")
  const [sandboxLoading, setSandboxLoading] = useState(false)

  const upsert = useMutation({
    mutationFn: () => api.upsertConstraint(editing!.id, {
      ...editing!,
      gpt_variant: editing!.gpt_variant || undefined,
      claude_variant: editing!.claude_variant || undefined,
      gemini_variant: editing!.gemini_variant || undefined,
    } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["constraints"] })
      queryClient.invalidateQueries({ queryKey: ["health"] })
      setEditing(null)
      toast.success("Constraint saved")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: (id: string) => api.deleteConstraint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["constraints"] })
      toast.success("Constraint deleted")
    },
    onError: (e: any) => toast.error(e.message),
  })

  async function runSandbox() {
    if (!sandboxPrompt.trim()) return
    setSandboxLoading(true)
    setSandboxResult("")
    try {
      const res = await api.ask({ user_prompt: sandboxPrompt, domain: "auto", model: "auto", session_id: null })
      setSandboxResult(res.structured_output)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSandboxLoading(false)
    }
  }

  if (healthLoading || constraintsLoading) return <PageSkeleton />

  const constraints = constraintsData?.constraints ?? []

  return (
    <PageShell
      title="Constraints"
      description="Manage constraint profiles and test them in the sandbox."
      action={isAdmin ? (
        <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
          + New Constraint
        </Button>
      ) : undefined}
    >
      <div className="space-y-6">

        {/* Editor */}
        {editing && (
          <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">{editing.id ? `Edit: ${editing.id}` : "New Constraint"}</h2>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="ID (e.g. backend, my-custom)"
                value={editing.id}
                onChange={e => setEditing(f => ({ ...f!, id: e.target.value }))}
                className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <input
                placeholder="Description"
                value={editing.description}
                onChange={e => setEditing(f => ({ ...f!, description: e.target.value }))}
                className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <input
                placeholder="Version (e.g. 1.0)"
                value={editing.version}
                onChange={e => setEditing(f => ({ ...f!, version: e.target.value }))}
                className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--text-secondary)]">Base constraint (all models)</label>
              <textarea
                rows={5}
                value={editing.constraints}
                onChange={e => setEditing(f => ({ ...f!, constraints: e.target.value }))}
                placeholder="You are a Staff Backend Engineer. Enforce idempotency..."
                className="w-full resize-none rounded-md border bg-[var(--background)] px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <details className="space-y-2">
              <summary className="text-xs text-[var(--text-secondary)] cursor-pointer">Per-model variants (optional)</summary>
              <div className="space-y-2 pt-2">
                {(["gpt_variant", "claude_variant", "gemini_variant"] as const).map(key => (
                  <div key={key}>
                    <label className="text-xs text-[var(--text-secondary)] capitalize">{key.replace("_", " ")}</label>
                    <textarea
                      rows={3}
                      value={(editing as any)[key]}
                      onChange={e => setEditing(f => ({ ...f!, [key]: e.target.value }))}
                      placeholder={`Override for ${key.split("_")[0]} models...`}
                      className="w-full mt-1 resize-none rounded-md border bg-[var(--background)] px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                ))}
              </div>
            </details>
            <Button
              disabled={!editing.id || !editing.constraints || upsert.isPending}
              onClick={() => upsert.mutate()}
            >
              {upsert.isPending ? "Saving..." : "Save Constraint"}
            </Button>
          </div>
        )}

        {/* Health scores */}
        {health && health.scores.length > 0 && (
          <div className="rounded-lg border bg-[var(--surface)]">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-medium">Constraint Health</h2>
            </div>
            <div className="divide-y">
              {health.scores.map((s) => (
                <div key={s.constraint_id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium">{s.constraint_id}</p>
                      <HealthBadge status={s.status} />
                    </div>
                    <span className={`text-lg font-semibold font-mono ${scoreColor(s.health_score)}`}>
                      {s.health_score.toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-[var(--text-secondary)]">
                    <span>{s.total_requests} requests</span>
                    <span>{s.total_overrides} overrides</span>
                    <span>{(s.override_rate * 100).toFixed(1)}% override rate</span>
                  </div>
                  {s.recommendation && (
                    <p className="mt-2 text-xs text-amber-500">{s.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constraint list */}
        <div className="rounded-lg border bg-[var(--surface)]">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-medium">Constraint Profiles</h2>
          </div>
          {constraints.length === 0 ? (
            <EmptyState title="No constraints" description="Create your first constraint profile above." />
          ) : (
            <div className="divide-y">
              {constraints.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{c.id}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{c.description} · v{c.version}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing({
                        id: c.id, description: c.description, constraints: c.constraints,
                        gpt_variant: c.gpt_variant ?? "", claude_variant: c.claude_variant ?? "",
                        gemini_variant: c.gemini_variant ?? "", version: c.version,
                      })}>
                        Edit
                      </Button>
                      {!["backend", "cyber", "blockchain", "general"].includes(c.id) && (
                        <Button size="sm" variant="outline" onClick={() => del.mutate(c.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sandbox */}
        <div className="rounded-lg border bg-[var(--surface)]">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-medium">Constraint Sandbox</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Test a prompt against your active constraints.</p>
          </div>
          <div className="p-5 space-y-3">
            <textarea
              value={sandboxPrompt}
              onChange={(e) => setSandboxPrompt(e.target.value)}
              placeholder="Enter a test prompt..."
              rows={3}
              className="w-full resize-none rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <Button onClick={runSandbox} disabled={sandboxLoading || !sandboxPrompt.trim()}>
              {sandboxLoading ? "Running..." : "Test Prompt"}
            </Button>
            {sandboxResult && (
              <pre className="mt-3 rounded-md bg-[var(--background)] border p-4 text-xs whitespace-pre-wrap overflow-x-auto">
                {sandboxResult}
              </pre>
            )}
          </div>
        </div>

      </div>
    </PageShell>
  )
}
