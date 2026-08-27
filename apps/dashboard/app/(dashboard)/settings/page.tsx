"use client"

import { useState, useEffect } from "react"
import { UserProfile } from "@clerk/nextjs"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { useMe } from "@/hooks/useRole"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { renameOrg, renameTeam } from "@/app/actions/onboarding"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useAuditLog, useModels } from "@/hooks/useOrchStatus"
import { useHasAccess } from "@/hooks/useRole"

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
        done ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-2 border-[var(--border)] text-[var(--text-secondary)]"
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

export default function SettingsPage() {
  const { data: me, isLoading } = useMe()
  const isAdmin = useHasAccess("admin")
  const { data: models } = useModels()
  const { data: audit } = useAuditLog()
  const queryClient = useQueryClient()

  // API key generation
  const [newKey, setNewKey] = useState<string | null>(null)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const deleteOrgMutation = useMutation({
    mutationFn: (id: string) => api.deleteOrg(id),
    onSuccess: () => {
      toast.success("Organization deleted")
      window.location.href = "/onboarding"
    },
    onError: (e: any) => toast.error(e.message),
  })

  // Rename state
  const [orgNameInput, setOrgNameInput] = useState("")
  const [teamNameInput, setTeamNameInput] = useState("")
  const [renamingOrg, setRenamingOrg] = useState(false)
  const [renamingTeam, setRenamingTeam] = useState(false)

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  useEffect(() => {
    if (me?.org_name) setOrgNameInput(me.org_name)
    if (me?.team_name) setTeamNameInput(me.team_name)
  }, [me?.org_name, me?.team_name])

  async function handleGenerateKey() {
    if (!me?.team_id) return
    setGeneratingKey(true)
    try {
      const data = await api.generateKey({ team_id: me.team_id })
      setNewKey(data.key)
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate key")
    } finally {
      setGeneratingKey(false)
    }
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRenameOrg() {
    if (!orgNameInput.trim() || !me?.org_id) return
    setRenamingOrg(true)
    try {
      await renameOrg(me.org_id, orgNameInput.trim())
      toast.success("Organization renamed")
      queryClient.invalidateQueries({ queryKey: ["me"] })
    } catch (e: any) {
      toast.error(e.message ?? "Failed to rename organization")
    } finally {
      setRenamingOrg(false)
    }
  }

  async function handleRenameTeam() {
    if (!teamNameInput.trim() || !me?.team_id) return
    setRenamingTeam(true)
    try {
      await renameTeam(me.team_id, teamNameInput.trim())
      toast.success("Team renamed")
      queryClient.invalidateQueries({ queryKey: ["me"] })
    } catch (e: any) {
      toast.error(e.message ?? "Failed to rename team")
    } finally {
      setRenamingTeam(false)
    }
  }

  if (isLoading) return <PageSkeleton />

  const hasModels = (models?.models.length ?? 0) > 0
  const hasSessions = (audit?.total_sessions ?? 0) > 0

  return (
    <PageShell title="Settings" description="Manage your workspace, team, and API key.">
      <div className="space-y-6 max-w-xl">

        {isAdmin && (
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

        {/* Organization Name */}
        {me?.org_id && (
          <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-3">
            <div>
              <h2 className="text-sm font-medium">Organization Name</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                This name appears across the dashboard and in team invites.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={orgNameInput}
                onChange={(e) => setOrgNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRenameOrg()}
                className="flex-1 rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <Button
                size="sm"
                disabled={renamingOrg || !orgNameInput.trim() || orgNameInput === me?.org_name}
                onClick={handleRenameOrg}
              >
                {renamingOrg ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* Team Name */}
        {me?.team_id && (
          <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-3">
            <div>
              <h2 className="text-sm font-medium">Team Name</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Your primary workspace team. Rename it to match your structure (e.g. "Backend", "AI Team").
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRenameTeam()}
                className="flex-1 rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <Button
                size="sm"
                disabled={renamingTeam || !teamNameInput.trim() || teamNameInput === me?.team_name}
                onClick={handleRenameTeam}
              >
                {renamingTeam ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* API Key */}
        <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-3">
          <div>
            <h2 className="text-sm font-medium">Orch API Key</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Use this key to authenticate your VS Code extension, CLI, or Orch Agent.
              For security, the full key is only shown once when generated.
            </p>
          </div>
          {newKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded border bg-[var(--background)] px-3 py-2 text-xs font-mono truncate">
                  {newKey}
                </code>
                <Button size="sm" onClick={copyKey}>{copied ? "Copied ✓" : "Copy"}</Button>
              </div>
              <p className="text-xs text-amber-500">⚠ Save this key now — it won't be shown again.</p>
            </div>
          ) : (
            <Button size="sm" variant="outline" disabled={generatingKey || !me?.team_id} onClick={handleGenerateKey}>
              {generatingKey ? "Generating..." : "Generate New Key"}
            </Button>
          )}
        </div>


        {/* Integrations */}
        <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
            <h2 className="text-sm font-medium">GitHub Integration</h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Connect the Orch GitHub App to your repositories to automatically run the Evaluator (Judge) on every Pull Request.
          </p>
          <div className="flex items-center gap-2 pt-2">
            {me?.github_installation_id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                  ✓ Connected
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  Installation ID: {me.github_installation_id}
                </span>
              </div>
            ) : (
              <Button size="sm" variant="default" onClick={() => {
                const githubAppUrl = process.env.NEXT_PUBLIC_GITHUB_APP_URL || "https://github.com/apps/orch-ai-reviewer/installations/new";
                window.open(githubAppUrl, '_blank');
              }}>
                Connect to GitHub
              </Button>
            )}
          </div>
        </div>

        {/* Billing & Plans */}
        <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-3">
          <h2 className="text-sm font-medium">Billing & Plans</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage your Orch subscription. Upgrade to Pro for unlimited team members and priority AI processing.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" onClick={async () => {
              try {
                const res = await fetch('/api/orch/v1/billing/checkout', { method: 'POST' });
                if (!res.ok) throw new Error("Failed to get checkout URL");
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              } catch (e) {
                toast.error("Failed to initiate checkout.");
              }
            }}>
              Upgrade to Pro
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        {isAdmin && me?.org_id && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-5 space-y-3">
            <h2 className="text-sm font-medium text-red-600">Danger Zone</h2>
            <p className="text-xs text-red-600/80">
              Permanently delete this organization, including all its teams, projects, constraints, and data. This action cannot be undone.
            </p>
            <div className="pt-2">
              <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
                setDeleteDialogOpen(open)
                if (!open) setDeleteConfirmText("")
              }}>
                <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                  Delete Organization
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your
                      organization and remove all data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Please type <strong className="text-[var(--text-primary)]">{me.org_name}</strong> to confirm.
                    </p>
                    <input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
                      placeholder={me.org_name}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <Button
                      variant="destructive"
                      disabled={deleteConfirmText !== me.org_name || deleteOrgMutation.isPending}
                      onClick={() => {
                        if (deleteConfirmText === me.org_name) {
                          deleteOrgMutation.mutate(me.org_id)
                        }
                      }}
                    >
                      {deleteOrgMutation.isPending ? "Deleting..." : "Delete Organization"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Clerk profile */}
        <UserProfile routing="hash" />
      </div>
    </PageShell>
  )
}
