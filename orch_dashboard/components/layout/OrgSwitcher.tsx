"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useMe } from "@/hooks/useRole"
import { switchOrg, createAdditionalOrg } from "@/app/actions/onboarding"
import { toast } from "sonner"

export function OrgSwitcher() {
  const { data: me } = useMe()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  const orgs: any[] = me?.orgs ?? []
  const activeOrgId = me?.org?.id

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

  async function handleSwitch(org: any) {
    if (org.org_id === activeOrgId) { setOpen(false); return }
    setLoading(true)
    try {
      await switchOrg(org.org_id, org.api_key)
      queryClient.clear()
      router.refresh()
      setOpen(false)
      toast.success(`Switched to ${org.org_name}`)
    } catch {
      toast.error("Failed to switch org")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newOrgName.trim()) return
    setLoading(true)
    try {
      await createAdditionalOrg({ orgName: newOrgName, teamName: "Engineering", modelPolicy: "open" })
      queryClient.clear()
      router.refresh()
      setOpen(false)
      setCreating(false)
      setNewOrgName("")
      toast.success(`${newOrgName} created`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!me) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setCreating(false) }}
        className="flex items-center gap-1.5 text-sm hover:text-[var(--text-primary)] transition-colors"
      >
        <span className="text-[var(--text-secondary)]">{me.org?.name}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--text-secondary)]">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-lg border bg-[var(--surface)] shadow-lg z-50 overflow-hidden">

          {/* Org list */}
          <div className="py-1">
            {orgs.map((org) => (
              <button
                key={org.org_id}
                onClick={() => handleSwitch(org)}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[var(--border)] transition-colors text-left"
              >
                <div>
                  <p className={`font-medium ${org.org_id === activeOrgId ? "text-[var(--accent)]" : ""}`}>
                    {org.org_name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 capitalize">{org.role} · {org.model_policy}</p>
                </div>
                {org.org_id === activeOrgId && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                )}
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
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  placeholder="Org name"
                  className="w-full rounded-md border bg-[var(--background)] px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newOrgName.trim() || loading}
                    className="flex-1 rounded-md bg-[var(--accent)] text-white text-xs py-1.5 font-medium disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewOrgName("") }}
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
