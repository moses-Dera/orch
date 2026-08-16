"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useHasAccess } from "@/hooks/useRole"

export default function ProjectsPage() {
  const isAdmin = useHasAccess("admin")
  const queryClient = useQueryClient()
  
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  })

  const { data: reposData, isLoading: isLoadingRepos } = useQuery({
    queryKey: ["github-repos"],
    queryFn: api.listGithubRepos,
  })

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [repoName, setRepoName] = useState("")

  const create = useMutation({
    mutationFn: () => api.createProject({ name, githubRepoFullName: repoName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setCreating(false)
      setName("")
      setRepoName("")
      toast.success("Project created")
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoadingProjects) return <PageSkeleton />

  const projects = projectsData?.projects ?? []
  const repos = reposData?.repos ?? []

  return (
    <PageShell
      title="Projects"
      description="Manage your projects and map them to GitHub repositories."
      action={isAdmin ? (
        <Button size="sm" onClick={() => setCreating(true)}>
          + New Project
        </Button>
      ) : undefined}
    >
      <div className="space-y-6">
        {creating && (
          <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-4">
            <h2 className="text-sm font-medium">New Project</h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Project Name (e.g. Frontend)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <select
                value={repoName}
                onChange={e => setRepoName(e.target.value)}
                className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                disabled={isLoadingRepos}
              >
                <option value="" disabled>Select GitHub Repo</option>
                {repos.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {repos.length === 0 && !isLoadingRepos && (
              <p className="text-xs text-amber-500">
                No repositories found. Ensure your GitHub App is linked in the Settings page and has access to your repositories.
              </p>
            )}
            <div className="flex gap-2">
              <Button disabled={!name || !repoName || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Saving..." : "Save Project"}
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-[var(--surface)]">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-medium">Active Projects</h2>
          </div>
          {projects.length === 0 ? (
            <EmptyState title="No projects" description="Create your first project to start mapping constraints." />
          ) : (
            <div className="divide-y">
              {projects.map((p: any) => (
                <div key={p.id} className="flex flex-col px-5 py-3 gap-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Repo: {p.githubRepoFullName || "Unlinked"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
