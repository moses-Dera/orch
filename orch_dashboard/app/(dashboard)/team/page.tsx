"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { useHasAccess } from "@/hooks/useRole"

const ROLE_COLORS: Record<string, string> = {
  owner:  "bg-[var(--accent)]/10 text-[var(--accent)]",
  admin:  "bg-purple-500/10 text-purple-500",
  member: "bg-[var(--success)]/10 text-[var(--success)]",
  viewer: "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]",
}

async function fetchMembers() {
  const res = await fetch("/api/orch/v1/members")
  if (!res.ok) throw new Error("Failed to fetch members")
  return res.json()
}

async function inviteMember(email: string, role: string) {
  const res = await fetch("/api/orch/v1/members/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail?.message ?? "Failed to send invite")
  return data
}

export default function TeamPage() {
  const isAdmin = useHasAccess("admin")
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ["members"], queryFn: fetchMembers })

  const invite = useMutation({
    mutationFn: () => inviteMember(email, role),
    onSuccess: (data) => {
      const link = `${window.location.origin}/onboarding?token=${data.token}`
      setInviteLink(link)
      setEmail("")
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success(`Invite created for ${data.email}`)
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <PageSkeleton />

  const members = data?.members ?? []

  return (
    <PageShell title="Team" description="Members and their access.">

      {/* Members table */}
      <div className="rounded-lg border bg-[var(--surface)]">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">{data?.team ?? "Team"}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""}</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => { setShowInvite(!showInvite); setInviteLink(null) }}>
              {showInvite ? "Cancel" : "Invite Member"}
            </Button>
          )}
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="px-5 py-4 border-b bg-[var(--background)] space-y-3">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">New Invite</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button
                size="sm"
                disabled={!email || invite.isPending}
                onClick={() => invite.mutate()}
              >
                {invite.isPending ? "Sending..." : "Send Invite"}
              </Button>
            </div>

            {inviteLink && (
              <div className="space-y-1.5">
                <p className="text-xs text-[var(--text-secondary)]">Share this link with your teammate:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border bg-[var(--surface)] px-3 py-2 text-xs font-mono truncate">
                    {inviteLink}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(inviteLink)
                    toast.success("Link copied")
                  }}>
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-[var(--warning)]">Link expires in 7 days.</p>
              </div>
            )}
          </div>
        )}

        {members.length === 0 ? (
          <EmptyState title="No members yet" description="Invite your team to get started." />
        ) : (
          <div className="divide-y">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-xs font-medium text-[var(--accent)]">
                    {(m.name ?? m.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.name ?? m.email}</p>
                    {m.name && <p className="text-xs text-[var(--text-secondary)]">{m.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.last_active && (
                    <p className="text-xs text-[var(--text-secondary)] hidden sm:block">
                      Active {formatDate(m.last_active)}
                    </p>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] ?? ROLE_COLORS.member}`}>
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </PageShell>
  )
}
