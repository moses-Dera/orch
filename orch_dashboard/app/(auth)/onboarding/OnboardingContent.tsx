"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMe } from "@/hooks/useRole"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createOrg, createIndividual, acceptInvite } from "@/app/actions/onboarding"

type Flow = "choose" | "org" | "invite" | "done"
type Policy = "open" | "allowlist" | "enforced"

const POLICY_DESC: Record<Policy, string> = {
  open: "Developers use any model. Constraints still enforced.",
  allowlist: "Developers choose from your approved list only.",
  enforced: "All developers use one model. No exceptions.",
}

export default function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: me } = useMe()
  const token = searchParams.get("token")

  const [flow, setFlow] = useState<Flow>(token ? "invite" : "choose")
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [teamName, setTeamName] = useState("Engineering")
  const [policy, setPolicy] = useState<Policy>("open")
  const [apiKey, setApiKey] = useState("")
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Start countdown when done, then redirect
  useEffect(() => {
    if (flow !== "done") return
    setCountdown(10)
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(t)
          window.location.href = "/"
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [flow])

  async function refreshAndRedirect() {
    window.location.href = "/"
  }

  useEffect(() => {
    if (token && flow === "invite") {
      handleAcceptInvite()
    }
  }, [token])

  async function handleAcceptInvite() {
    if (!token) return
    setLoading(true)
    try {
      await acceptInvite(token)
      toast.success("Invite accepted. Welcome to Orch.")
      await refreshAndRedirect()
    } catch (e: any) {
      toast.error(e.message)
      setFlow("choose")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOrg() {
    if (!orgName.trim()) { toast.error("Enter your org name."); return }
    setLoading(true)
    try {
      const data = await createOrg({ orgName, teamName, modelPolicy: policy })
      setApiKey(data.api_key)
      setFlow("done")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateIndividual() {
    setLoading(true)
    try {
      const data = await createIndividual()
      setApiKey(data.api_key)
      setFlow("done")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (flow === "invite") {
    return (
      <div className="rounded-lg border bg-[var(--surface)] p-8 text-center space-y-3">
        <p className="text-sm font-medium">Accepting your invite...</p>
        <p className="text-xs text-[var(--text-secondary)]">Just a moment.</p>
      </div>
    )
  }

  if (flow === "done") {
    return (
      <div className="rounded-lg border bg-[var(--surface)] p-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">You're all set</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Save your API key — you'll need it for the VS Code extension, CLI, and Orch Agent.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Your API Key</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded border bg-[var(--background)] px-3 py-2 text-xs font-mono truncate">
              {apiKey}
            </code>
            <Button size="sm" onClick={copyKey}>{copied ? "Copied" : "Copy"}</Button>
          </div>
          <p className="text-xs text-amber-500">This is the only time this key will be shown in full.</p>
        </div>
        <Button className="w-full" onClick={refreshAndRedirect}>
          Go to Dashboard {countdown !== null && countdown > 0 ? `(${countdown})` : ""}
        </Button>
      </div>
    )
  }

  if (flow === "choose") {
    return (
      <div className="rounded-lg border bg-[var(--surface)] p-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">
            Welcome{me?.name ? `, ${me.name}` : me?.email ? `, ${me.email.split("@")[0]}` : ""}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">How are you using Orch?</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => setFlow("org")}
            className="w-full text-left rounded-lg border p-4 hover:bg-[var(--border)] transition-colors"
          >
            <p className="text-sm font-medium">For my team</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Create an org, invite developers, set model policy and constraints.
            </p>
          </button>
          <button
            onClick={handleCreateIndividual}
            disabled={loading}
            className="w-full text-left rounded-lg border p-4 hover:bg-[var(--border)] transition-colors disabled:opacity-50"
          >
            <p className="text-sm font-medium">Just for me</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Personal workspace. Use your own AI keys with Orch's constraints.
            </p>
          </button>
        </div>
      </div>
    )
  }

  // Org setup
  const steps = ["Name your org", "Model policy", "Review"]
  return (
    <div className="rounded-lg border bg-[var(--surface)] p-8 space-y-6">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              i < step ? "bg-[var(--accent)] text-white"
              : i === step ? "border-2 border-[var(--accent)] text-[var(--accent)]"
              : "border text-[var(--text-secondary)]"
            }`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 ${i < step ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
            )}
          </div>
        ))}
      </div>

      <h2 className="text-base font-semibold">{steps[step]}</h2>

      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-secondary)]">Organization name</label>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && orgName.trim() && setStep(1)}
              placeholder="Acme Corp"
              autoFocus
              className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-secondary)]">First team name</label>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Engineering"
              className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">How should your team use AI models?</p>
          {(["open", "allowlist", "enforced"] as Policy[]).map((p) => (
            <button
              key={p}
              onClick={() => setPolicy(p)}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${
                policy === p ? "border-[var(--accent)] bg-[var(--accent)]/5" : "hover:bg-[var(--border)]"
              }`}
            >
              <p className="text-sm font-medium capitalize">{p}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{POLICY_DESC[p]}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="rounded-lg bg-[var(--background)] border p-4 space-y-2 text-sm">
          <p><span className="text-[var(--text-secondary)]">Org:</span> {orgName}</p>
          <p><span className="text-[var(--text-secondary)]">Team:</span> {teamName}</p>
          <p><span className="text-[var(--text-secondary)]">Policy:</span> {policy}</p>
        </div>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">Back</Button>
        )}
        {step < steps.length - 1 ? (
          <Button
            onClick={() => {
              if (step === 0 && !orgName.trim()) { toast.error("Enter your org name."); return }
              setStep(step + 1)
            }}
            className="flex-1"
          >
            Continue
          </Button>
        ) : (
          <Button onClick={handleCreateOrg} disabled={loading} className="flex-1">
            {loading ? "Creating..." : "Create Org"}
          </Button>
        )}
      </div>

      <button
        onClick={() => setFlow("choose")}
        className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        Back to options
      </button>
    </div>
  )
}
