"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useHasAccess } from "@/hooks/useRole"

const POLICY_DESC: Record<string, string> = {
  enforced: "All developers use one model. Developer choice is overridden.",
  allowlist: "Developers choose from approved models only.",
  open: "Developers can use any model. Constraints still enforced.",
}

const BLANK = {
  display_name: "", provider: "openai", model_id: "",
  endpoint: "", api_key: "", context_window: 128000,
}

export default function ModelsPage() {
  const isAdmin = useHasAccess("admin")
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(BLANK)

  const { data, isLoading } = useQuery({ queryKey: ["models"], queryFn: api.models })

  const add = useMutation({
    mutationFn: () => api.addModel({
      ...form,
      endpoint: form.endpoint || undefined,
      api_key: form.api_key || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] })
      setShowAdd(false)
      setForm(BLANK)
      toast.success("Model added")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.removeModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] })
      toast.success("Model removed")
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <PageSkeleton />

  return (
    <PageShell title="Models" description="Approved models and policy for your org.">
      <div className="space-y-6">

        {data && (
          <div className="rounded-lg border bg-[var(--surface)] p-5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Policy:</span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent)]/10">
                {data.policy}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{POLICY_DESC[data.policy]}</p>
          </div>
        )}

        <div className="rounded-lg border bg-[var(--surface)]">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-medium">Approved Models</h2>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
                {showAdd ? "Cancel" : "+ Add Model"}
              </Button>
            )}
          </div>

          {showAdd && (
            <div className="px-5 py-4 border-b bg-[var(--background)] space-y-3">
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">New Model</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Display name (e.g. Our GPT-4o)"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  className="rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <input
                  placeholder="Model ID (e.g. openai/gpt-4.1)"
                  value={form.model_id}
                  onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))}
                  className="rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <input
                  placeholder="Provider (e.g. openai)"
                  value={form.provider}
                  onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                  className="rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <input
                  type="number"
                  placeholder="Context window (tokens)"
                  value={form.context_window}
                  onChange={e => setForm(f => ({ ...f, context_window: Number(e.target.value) }))}
                  className="rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <input
                  placeholder="API key (optional)"
                  type="password"
                  value={form.api_key}
                  onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                  className="rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <input
                  placeholder="Custom endpoint (optional)"
                  value={form.endpoint}
                  onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
                  className="rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <Button
                size="sm"
                disabled={!form.display_name || !form.model_id || add.isPending}
                onClick={() => add.mutate()}
              >
                {add.isPending ? "Adding..." : "Add Model"}
              </Button>
            </div>
          )}

          {!data || data.models.length === 0 ? (
            <div className="px-5 py-10 text-center space-y-3">
              <p className="text-sm font-medium">No models configured yet</p>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
                Add your first model to start using Orch. You'll need a model ID and an API key from your provider.
              </p>
              <div className="text-xs text-[var(--text-secondary)] space-y-1 pt-1">
                <p>OpenAI → <code className="font-mono">openai/gpt-4o</code> + your OpenAI API key</p>
                <p>Anthropic → <code className="font-mono">anthropic/claude-3-5-sonnet-20241022</code> + your Anthropic key</p>
                <p>Gemini → <code className="font-mono">gemini/gemini-1.5-pro</code> + your Google AI key</p>
              </div>
              {isAdmin && !showAdd && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  + Add your first model
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {data.models.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {m.id} · {m.provider} · {(m.context_window / 1000).toFixed(0)}K context
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => remove.mutate(m.id)}
                      disabled={remove.isPending}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </PageShell>
  )
}
