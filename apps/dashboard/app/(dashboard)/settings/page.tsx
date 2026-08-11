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
            <Button size="sm" variant="default" onClick={() => {
              const githubAppUrl = process.env.NEXT_PUBLIC_GITHUB_APP_URL || "https://github.com/apps/orch-ai-governance/installations/new";
              window.open(githubAppUrl, '_blank');
            }}>
              Connect GitHub
            </Button>
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
