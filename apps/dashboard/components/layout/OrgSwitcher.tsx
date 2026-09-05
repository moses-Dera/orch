"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useMe } from "@/hooks/useRole"
import { switchActiveOrg, createAdditionalOrg } from "@/app/actions/onboarding"
import { toast } from "sonner"
import { Check } from "lucide-react"

export function OrgSwitcher() {
  const { data: me } = useMe()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [newTeamName, setNewTeamName] = useState("Engineering")
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  async function handleCreate() {
    if (!newOrgName.trim()) return
    setLoading(true)
    try {
      await createAdditionalOrg({ orgName: newOrgName, teamName: newTeamName || "Engineering", modelPolicy: "open" })
      queryClient.invalidateQueries({ queryKey: ["me"] })
      router.refresh()
      setOpen(false)
      setCreating(false)
      setNewOrgName("")
      setNewTeamName("Engineering")
      toast.success(`${newOrgName} created`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSwitch(orgId: string) {
    if (orgId === me?.org_id) {
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      await switchActiveOrg(orgId)
      queryClient.invalidateQueries()
      router.refresh()
      setOpen(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!me) return null

  const orgName = me.org_name ?? "—"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setCreating(false) }}
        className="flex items-center gap-1.5 text-sm hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        disabled={loading}
      >
        <span className="text-[var(--text-secondary)]">{orgName}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--text-secondary)]">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-lg border bg-[var(--surface)] shadow-lg z-50 overflow-hidden">

          {/* Available orgs info */}
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Workspaces</p>
          </div>

          <div className="py-1 max-h-60 overflow-y-auto">
            {me.available_teams?.map((t: any) => (
              <button
                key={t.team_id}
                onClick={() => handleSwitch(t.org_id)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--border)] transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold">{t.org_name}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{t.team_name}</div>
                </div>
                {t.org_id === me.org_id && <Check className="w-4 h-4 text-[var(--accent)]" />}
              </button>
            ))}
          </div>

          <div className="border-t py-1">
            {!creating ? (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
              >
                + New org
              </button>
            ) : (
              <div className="px-4 py-2.5 space-y-2">
                <input
                  autoFocus
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  placeholder="Organization name"
                  className="w-full rounded-md border bg-[var(--background)] px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <input
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  placeholder="First team name (e.g. Engineering)"
                  className="w-full rounded-md border bg-[var(--background)] px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newOrgName.trim() || loading}
                    className="flex-1 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] text-xs py-1.5 font-medium disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewOrgName(""); setNewTeamName("Engineering") }}
                    className="flex-1 rounded-md border text-xs py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
