"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useHasAccess } from "@/hooks/useRole"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

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
  const [projectToDelete, setProjectToDelete] = useState<{id: string, name: string} | null>(null)

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

  const deleteProj = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Project deleted")
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
        {!isLoadingRepos && repos.length === 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-500">GitHub App Not Connected</h3>
              <p className="text-sm text-amber-500/80 mt-1">
                You haven't linked a GitHub account yet, or your app doesn't have access to any repositories. You need to connect GitHub to map projects to repositories.
              </p>
              <Link href="/github">
                <button className="mt-3 text-xs font-medium bg-transparent border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 px-3 py-1.5 rounded-md transition-colors">
                  Connect GitHub App
                </button>
              </Link>
            </div>
          </div>
        )}

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
                <div key={p.id} className="flex px-5 py-3 gap-1 items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Repo: {p.githubRepoFullName || "Unlinked"}</p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => setProjectToDelete({ id: p.id, name: p.name })}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {projectToDelete?.name}? This will remove all constraints linked to it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setProjectToDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (projectToDelete) {
                  deleteProj.mutate(projectToDelete.id)
                  setProjectToDelete(null)
                }
              }}
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
