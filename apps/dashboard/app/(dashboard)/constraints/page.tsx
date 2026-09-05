"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { HealthBadge } from "@/components/shared/HealthBadge"
import { Button } from "@/components/ui/button"
import { useHealth } from "@/hooks/useOrchStatus"
import { useHasAccess } from "@/hooks/useRole"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { scoreColor } from "@/lib/utils"
import { CustomSelect } from "@/components/ui/custom-select"

const BLANK = {
  id: "", projectId: "", description: "", constraints: "",
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
  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  })

  const [editing, setEditing] = useState<typeof BLANK | null>(null)

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

  if (healthLoading || constraintsLoading) return <PageSkeleton />

  const constraints = constraintsData?.constraints ?? []
  const projects = projectsData?.projects ?? []

  return (
    <PageShell
      title="Constraints"
      description="Manage semantic rules and code standards."
      action={isAdmin ? (
        <Button size="sm" onClick={() => setEditing({ ...BLANK, projectId: projects[0]?.id ?? "" })}>
          + New Constraint
        </Button>
      ) : undefined}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Constraints List & Health */}
        <div className={`${editing ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-6 transition-all duration-300`}>
          
          {/* Health Summary (if available) */}
          {health && health.scores.length > 0 && !editing && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-sm font-medium mb-4">Workspace Health</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {health.scores.map((s) => (
                  <div key={s.constraint_id} className="p-4 rounded-md bg-[var(--background)] border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium truncate pr-2">{s.constraint_id}</p>
                      <HealthBadge status={s.status} />
                    </div>
                    <span className={`text-xl font-bold font-mono ${scoreColor(s.health_score)}`}>
                      {s.health_score.toFixed(0)}
                    </span>
                    <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
                      {s.total_requests} requests · {(s.override_rate * 100).toFixed(0)}% overrides
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constraint List */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] flex flex-col h-full min-h-[400px]">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-medium">Active Profiles</h2>
            </div>
            
            {constraints.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <p className="text-sm font-medium mb-2">No active constraints</p>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                  Define markdown rules to enforce architecture and security standards.
                </p>
                {isAdmin && (
                  <Button className="mt-4" size="sm" onClick={() => setEditing({ ...BLANK, projectId: projects[0]?.id ?? "" })}>
                    Create First Constraint
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {constraints.map((c: any) => (
                  <div 
                    key={c.id} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 transition-colors cursor-pointer hover:bg-[var(--background)] ${editing?.id === c.id ? 'bg-[var(--background)] border-l-2 border-l-[var(--accent)]' : 'border-l-2 border-l-transparent'}`}
                    onClick={() => setEditing({
                      id: c.id, projectId: c.projectId, description: c.description, constraints: c.constraints,
                      gpt_variant: c.gpt_variant ?? "", claude_variant: c.claude_variant ?? "",
                      gemini_variant: c.gemini_variant ?? "", version: c.version,
                    })}
                  >
                    <div>
                      <p className="text-sm font-medium">{c.id}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{c.description} · v{c.version}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2 mt-3 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          setEditing({
                            id: c.id, projectId: c.projectId, description: c.description, constraints: c.constraints,
                            gpt_variant: c.gpt_variant ?? "", claude_variant: c.claude_variant ?? "",
                            gemini_variant: c.gemini_variant ?? "", version: c.version,
                          });
                        }}>
                          Edit
                        </Button>
                        {!["backend", "cyber", "blockchain", "general"].includes(c.id) && (
                          <Button size="sm" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            del.mutate(c.id);
                          }}>
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
        </div>

        {/* Right Column: Editor Side Panel */}
        {editing && (
          <div className="lg:col-span-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex flex-col h-[calc(100vh-140px)] sticky top-[80px]">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)]/50">
              <h2 className="text-sm font-medium">{editing.id ? `Edit Constraint: ${editing.id}` : "New Constraint"}</h2>
              <button onClick={() => setEditing(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs">
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Identifier ID</label>
                  <input
                    placeholder="e.g. backend-auth"
                    value={editing.id}
                    onChange={e => setEditing(f => ({ ...f!, id: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Target Project</label>
                  <CustomSelect
                    value={editing.projectId}
                    onChange={val => setEditing(f => ({ ...f!, projectId: val }))}
                    placeholder="Select Project"
                    options={[
                      { value: "", label: "Select Project" },
                      ...projects.map((p: any) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Description</label>
                  <input
                    placeholder="What does this constraint enforce?"
                    value={editing.description}
                    onChange={e => setEditing(f => ({ ...f!, description: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Version</label>
                  <input
                    placeholder="e.g. 1.0"
                    value={editing.version}
                    onChange={e => setEditing(f => ({ ...f!, version: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Main Markdown Editor */}
              <div className="space-y-1.5 flex-1 flex flex-col">
                <label className="text-xs font-medium text-[var(--text-secondary)] flex justify-between">
                  <span>Rules & Standards (Markdown)</span>
                </label>
                <textarea
                  value={editing.constraints}
                  onChange={e => setEditing(f => ({ ...f!, constraints: e.target.value }))}
                  placeholder="Define your rules using markdown... \n\n1. Do not use raw SQL.\n2. Always type-check API inputs."
                  className="w-full flex-1 min-h-[250px] resize-none rounded-md border border-[var(--border)] bg-[var(--background)] p-4 text-sm font-mono leading-relaxed outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              {/* Advanced Model Overrides */}
              <details className="space-y-3 group border border-[var(--border)] rounded-md p-4 bg-[var(--background)]/30">
                <summary className="text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none">
                  Model-Specific Overrides (Optional)
                </summary>
                <div className="space-y-4 pt-3">
                  {(["gpt_variant", "claude_variant", "gemini_variant"] as const).map(key => (
                    <div key={key}>
                      <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider mb-1 block">
                        {key.split("_")[0]}
                      </label>
                      <textarea
                        rows={2}
                        value={(editing as any)[key]}
                        onChange={e => setEditing(f => ({ ...f!, [key]: e.target.value }))}
                        placeholder={`Specific prompt tweaking for ${key.split("_")[0]}...`}
                        className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                  ))}
                </div>
              </details>
            </div>
            
            <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--background)]/50 flex justify-end gap-3">
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!editing.id || !editing.constraints || upsert.isPending}
                onClick={() => upsert.mutate()}
              >
                {upsert.isPending ? "Saving..." : "Save Constraint"}
              </Button>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  )
}
