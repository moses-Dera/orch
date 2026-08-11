"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/button"
import { GitMerge } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function GithubAppPage() {
  const searchParams = useSearchParams()
  const [installationId, setInstallationId] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const id = searchParams.get("installation_id")
    if (id) setInstallationId(id)
  }, [searchParams])

  const handleInstall = () => {
    // In a real app, this would redirect to the GitHub App installation URL
    window.open("https://github.com/apps/orch-agent/installations/new", "_blank");
  };

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.setGithubInstallation(installationId)
      toast.success("GitHub Installation ID linked successfully!")
      setInstallationId("")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="GitHub Integration" description="Connect Orch to your GitHub repositories.">
      <div className="max-w-xl space-y-6">
        <div className="rounded-lg border bg-[var(--surface)] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <GitMerge className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-semibold">Orch GitHub App</h2>
              <p className="text-sm text-[var(--text-secondary)]">Automated PR Reviews & Constraint Enforcement</p>
            </div>
          </div>
          
          <p className="text-sm">
            Install the Orch GitHub App to automatically review Pull Requests against your organization's active constraints. Orch will leave review comments and block merges if architectural rules are violated.
          </p>

          <div className="pt-4 border-t border-[var(--background)]">
            <Button onClick={handleInstall} className="w-full flex items-center justify-center gap-2">
              <GitMerge className="w-4 h-4" />
              Install on GitHub
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-[var(--surface)] p-6">
          <h3 className="text-sm font-semibold mb-3">Link Installation</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">Paste your GitHub App Installation ID here to wire up webhooks.</p>
          <div className="flex gap-3">
            <input 
              className="flex-1 rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]" 
              placeholder="e.g. 12345678"
              value={installationId}
              onChange={(e) => setInstallationId(e.target.value)}
            />
            <Button disabled={loading || !installationId} onClick={handleSave}>
              {loading ? "Saving..." : "Save Link"}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
