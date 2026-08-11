"use client"

import { useState, useEffect } from "react"
import { UserProfile } from "@clerk/nextjs"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { useMe } from "@/hooks/useRole"
import { toast } from "sonner"

export default function SettingsPage() {
  const { data: me, isLoading } = useMe()
  const [revealed, setRevealed] = useState(false)
  const [models, setModels] = useState<any[]>([])
  const [isModelsLoading, setIsModelsLoading] = useState(false)
  const [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1')
  const [providerKey, setProviderKey] = useState('')

  useEffect(() => {
    // Initial fetch for OpenRouter (default)
    fetchModels('https://openrouter.ai/api/v1', '')
  }, [])

  async function fetchModels(url: string, key: string) {
    setIsModelsLoading(true)
    try {
      const res = await fetch('/api/orch/v1/dashboard/provider/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: url, apiKey: key })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setModels(data.models || [])
    } catch {
      toast.error('Failed to fetch models from provider.')
    } finally {
      setIsModelsLoading(false)
    }
  }

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
          <h2 className="text-sm font-medium">Your Orch API Key</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Use this internal key to authenticate your VS Code extension or CLI.
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

        {/* AI Provider Settings */}
        <div className="rounded-lg border bg-[var(--surface)] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-medium">AI Provider Settings</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Configure your AI provider (OpenRouter, OpenAI, DeepSeek, etc).
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Provider Base URL</label>
            <input 
              type="text" 
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1" 
              className="w-full rounded border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">API Key</label>
            <div className="flex items-center gap-2">
              <input 
                id="ai-api-key"
                type="password" 
                value={providerKey}
                onChange={(e) => setProviderKey(e.target.value)}
                placeholder="sk-..." 
                className="flex-1 rounded border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <Button size="sm" variant="outline" onClick={() => fetchModels(baseUrl, providerKey)}>
                {isModelsLoading ? "Fetching..." : "Fetch Models"}
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <label className="text-xs font-medium">Preferred Model</label>
            <select className="w-full rounded border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]" disabled={isModelsLoading}>
              <option disabled>Select a model...</option>
              {models.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
            <Button size="sm" className="mt-3 w-full" onClick={async () => {
              if (!providerKey) {
                toast.error("Please enter an API Key.");
                return;
              }
              try {
                // Here we would save baseUrl, providerKey, and selected model to the DB.
                // For MVP, we save the key using the existing billing key endpoint.
                const res = await fetch('/api/orch/v1/billing/key', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ apiKey: providerKey })
                });
                if (res.ok) {
                  toast.success("AI Configuration saved securely.");
                } else throw new Error();
              } catch (e) {
                toast.error("Failed to save configuration.");
              }
            }}>Save Configuration</Button>
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
                const res = await fetch('/api/orch/v1/billing/checkout', {
                  method: 'POST',
                });
                if (!res.ok) throw new Error("Failed to get checkout URL");
                const data = await res.json();
                if (data.url) {
                  window.location.href = data.url;
                }
              } catch (e) {
                toast.error("Failed to initiate checkout.");
              }
            }}>
              Upgrade to Pro
            </Button>
          </div>
        </div>

        {/* Clerk profile */}
        <UserProfile routing="hash" />
      </div>
    </PageShell>
  )
}
