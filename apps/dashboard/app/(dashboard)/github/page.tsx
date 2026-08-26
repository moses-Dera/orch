"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/button"
import { Github, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function GithubAppPage() {
  const searchParams = useSearchParams()
  const [installationId, setInstallationId] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchingStatus, setFetchingStatus] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const [githubData, setGithubData] = useState<{
    accountName?: string;
    avatarUrl?: string;
    repos: string[];
  } | null>(null)

  useEffect(() => {
    const id = searchParams.get("installation_id")
    if (id) setInstallationId(id)
  }, [searchParams])

  const fetchStatus = async () => {
    setFetchingStatus(true)
    try {
      const data = await api.listGithubRepos()
      if (data.repos.length > 0 || data.accountName) {
        setGithubData(data)
      } else {
        setGithubData(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setFetchingStatus(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleInstall = () => {
    // Navigate to github app installation
    const githubAppUrl = process.env.NEXT_PUBLIC_GITHUB_APP_URL || "https://github.com/apps/orch-ai-reviewer/installations/new";
    window.open(githubAppUrl, '_blank');
  };

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.setGithubInstallation(installationId)
      toast.success("GitHub Installation ID linked successfully!")
      setInstallationId("")
      fetchStatus() // Refresh the status after saving
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const renderAdvanced = () => (
    <div className="mt-8 pt-6 border-t border-[var(--background)]">
      <button 
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors mb-4"
      >
        Advanced / Manual Fallback
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {showAdvanced && (
        <div className="rounded-lg border bg-[var(--surface)] p-6">
          <h3 className="text-sm font-semibold mb-3">Link Installation Manually</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">If the automatic redirect failed, paste your GitHub App Installation ID here to wire up webhooks.</p>
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
      )}
    </div>
  )

  if (fetchingStatus) {
    return (
      <PageShell title="GitHub Integration" description="Connect Orch to your GitHub repositories.">
        <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="GitHub Integration" description="Connect Orch to your GitHub repositories.">
      <div className="max-w-xl space-y-6">
        
        {githubData ? (
          // Connected State
          <div className="space-y-6">
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-6 flex items-center gap-4">
              {githubData.avatarUrl ? (
                <img src={githubData.avatarUrl} alt="GitHub Avatar" className="w-12 h-12 rounded-full border border-[var(--border)]" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--surface)] flex items-center justify-center border border-[var(--border)]">
                  <Github className="w-6 h-6" />
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">{githubData.accountName || "GitHub Account"}</h2>
                  <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Orch is actively monitoring your authorized repositories for Pull Requests.
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-[var(--surface)] overflow-hidden">
              <div className="p-4 border-b border-[var(--background)] bg-[var(--background)]/50">
                <h3 className="text-sm font-semibold text-white">Authorized Repositories ({githubData.repos.length})</h3>
              </div>
              {githubData.repos.length > 0 ? (
                <ul className="divide-y divide-[var(--background)]">
                  {githubData.repos.map((repo) => (
                    <li key={repo} className="p-4 text-sm flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                        <Github className="w-4 h-4" />
                        <span className="text-white">{repo}</span>
                      </div>
                      <span className="text-xs text-green-400">Active</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
                  No repositories authorized. Go to your GitHub App settings to add them.
                </div>
              )}
            </div>
            
            {renderAdvanced()}
          </div>
        ) : (
          // Disconnected State
          <div>
            <div className="rounded-lg border bg-[var(--surface)] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Github className="w-8 h-8" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Orch GitHub App</h2>
                  <p className="text-sm text-[var(--text-secondary)]">Automated PR Reviews & Constraint Enforcement</p>
                </div>
              </div>
              
              <p className="text-sm text-[var(--text-secondary)]">
                Install the Orch GitHub App to automatically review Pull Requests against your organization's active constraints. Orch will leave review comments and block merges if architectural rules are violated.
              </p>

              <div className="pt-4 border-t border-[var(--background)]">
                <Button onClick={handleInstall} className="w-full flex items-center justify-center gap-2">
                  <Github className="w-4 h-4" />
                  Install on GitHub
                </Button>
              </div>
            </div>

            {renderAdvanced()}
          </div>
        )}

      </div>
    </PageShell>
  )
}
