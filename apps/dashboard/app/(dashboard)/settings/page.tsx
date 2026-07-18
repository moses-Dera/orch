"use client"

import { useState } from "react"
import { UserProfile } from "@clerk/nextjs"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { useMe } from "@/hooks/useRole"
import { toast } from "sonner"

export default function SettingsPage() {
  const { data: me, isLoading } = useMe()
  const [revealed, setRevealed] = useState(false)

  const apiKey = me?.api_key as string | undefined

  function copyKey() {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    toast.success("API key copied")
  }

  if (isLoading) return <PageSkeleton />

  return (
    <PageShell title="Settings" description="Your profile and API key.">
      <div className="space-y-6 max-w-xl">

        {/* API Key */}
        <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-3">
          <h2 className="text-sm font-medium">Your API Key</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Use this key in the VS Code extension, CLI, or Orch Agent.
          </p>
          {apiKey ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded border bg-[var(--background)] px-3 py-2 text-xs font-mono truncate">
                {revealed ? apiKey : "orch_" + "•".repeat(32)}
              </code>
              <Button variant="outline" size="sm" onClick={() => setRevealed(!revealed)}>
                {revealed ? "Hide" : "Show"}
              </Button>
              <Button size="sm" onClick={copyKey}>Copy</Button>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">No API key found. Contact your admin.</p>
          )}
        </div>

        {/* Clerk profile */}
        <UserProfile routing="hash" />
      </div>
    </PageShell>
  )
}
