"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useHasAccess } from "@/hooks/useRole"
import { Lightbulb, Globe, Zap, Sparkles, Server, ExternalLink } from "lucide-react"

const POLICY_DESC: Record<string, string> = {
  enforced: "All developers use one model. Developer choice is overridden.",
  allowlist: "Developers choose from approved models only.",
  open: "Developers can use any model. Constraints still enforced.",
}

const PRESETS: Record<string, { display_name: string; model_id: string; context_window: number }> = {
  openai: [
    { display_name: "GPT-4o", model_id: "openai/gpt-4o", context_window: 128000 },
    { display_name: "GPT-4o Mini", model_id: "openai/gpt-4o-mini", context_window: 128000 },
  ],
  anthropic: [
    { display_name: "Claude 3.5 Sonnet", model_id: "anthropic/claude-3-5-sonnet-20241022", context_window: 200000 },
    { display_name: "Claude 3.5 Haiku", model_id: "anthropic/claude-3-5-haiku-20241022", context_window: 200000 },
  ],
  google: [
    { display_name: "Gemini 1.5 Pro", model_id: "gemini/gemini-1.5-pro", context_window: 2097152 },
    { display_name: "Gemini 1.5 Flash", model_id: "gemini/gemini-1.5-flash", context_window: 1048576 },
  ],
  moonshot: [
    { display_name: "Kimi (Moonshot v1 8k)", model_id: "moonshot/moonshot-v1-8k", context_window: 8192 },
    { display_name: "Kimi (Moonshot v1 32k)", model_id: "moonshot/moonshot-v1-32k", context_window: 32768 },
    { display_name: "Kimi (Moonshot v1 128k)", model_id: "moonshot/moonshot-v1-128k", context_window: 128000 },
  ],
  minimax: [
    { display_name: "Minimax abab6.5s", model_id: "minimax/abab6.5s-chat", context_window: 24576 },
    { display_name: "Minimax abab6.5", model_id: "minimax/abab6.5-chat", context_window: 24576 },
  ],
  ollama: [
    { display_name: "Llama 3 (8B)", model_id: "ollama/llama3", context_window: 8192 },
    { display_name: "Llama 3 (70B)", model_id: "ollama/llama3:70b", context_window: 8192 },
    { display_name: "Mistral", model_id: "ollama/mistral", context_window: 32768 },
    { display_name: "Phi-3 Mini", model_id: "ollama/phi3", context_window: 128000 },
  ],
  nvidia: [
    { display_name: "Llama 3 70B Instruct", model_id: "nvidia/meta/llama3-70b-instruct", context_window: 8192 },
    { display_name: "Mistral NeMo 12B", model_id: "nvidia/nv-mistralai/mistral-nemo-12b-instruct", context_window: 128000 },
  ]
} as any

const BLANK = {
  display_name: "", provider: "openai", model_id: "",
  endpoint: "", api_key: "", context_window: 128000,
}

export default function ModelsPage() {
  const isAdmin = useHasAccess("admin")
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(BLANK)
  
  const [providerType, setProviderType] = useState<"openai" | "anthropic" | "google" | "moonshot" | "minimax" | "ollama" | "nvidia" | "openrouter" | "custom">("openai")
  const [fetchedModels, setFetchedModels] = useState<any[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  function handleProviderTypeChange(type: string) {
    setProviderType(type as any)
    let endpoint = "";
    if (type === "openrouter") endpoint = "https://openrouter.ai/api/v1";
    if (type === "ollama") endpoint = "http://localhost:11434/v1";
    
    setForm(f => ({ 
      ...f, 
      provider: type === "google" ? "gemini" : type, 
      endpoint,
      model_id: "",
      display_name: ""
    }))
    setFetchedModels([])
  }

  async function fetchProviderModels() {
    if (!form.api_key) return toast.error("API Key required to fetch models")
    setIsFetching(true)
    try {
      const baseUrl = providerType === "openrouter" ? "https://openrouter.ai/api/v1" : form.endpoint
      const res = await fetch('/api/orch/v1/dashboard/provider/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey: form.api_key })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFetchedModels(data.models || [])
      toast.success("Models fetched successfully")
    } catch {
      toast.error("Failed to fetch models")
    } finally {
      setIsFetching(false)
    }
  }

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

  const updateRole = useMutation({
    mutationFn: ({ id, role, value }: { id: string; role: "is_critic" | "is_judge"; value: boolean }) =>
      api.updateModel(id, { [role]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] })
      toast.success("Model role updated")
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
            <div className="px-5 py-5 border-b bg-[var(--background)] space-y-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">New Model</p>
              
              <div className="space-y-3 max-w-2xl">
                <label className="text-sm font-medium">Provider</label>
                <select 
                  value={providerType} 
                  onChange={e => handleProviderTypeChange(e.target.value)}
                  className="w-full rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google Gemini</option>
                  <option value="moonshot">Kimi (Moonshot)</option>
                  <option value="minimax">Minimax</option>
                  <option value="ollama">Ollama (Local)</option>
                  <option value="nvidia">NVIDIA NIM</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="custom">Custom Provider</option>
                </select>
              </div>

              <div className="space-y-3 max-w-2xl">
                <label className="text-sm font-medium">API Key {providerType === 'custom' || providerType === 'openrouter' || providerType === 'ollama' ? '(Optional for local)' : '(Required)'}</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={`Your ${providerType} API key`}
                    value={form.api_key}
                    onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                    className="flex-1 rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                  {(providerType === "openrouter" || providerType === "custom") && (
                    <Button size="sm" variant="outline" onClick={fetchProviderModels} disabled={isFetching}>
                      {isFetching ? "Fetching..." : "Fetch Models"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Free AI Models Guide */}
              <div className="max-w-2xl mt-8 rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-start gap-3">
                  <div className="text-[var(--text-secondary)] mt-0.5"><Lightbulb size={18} /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Zero-Cost AI Providers</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Don't want to pay for API tokens? These providers offer generous free tiers to get you started immediately.
                    </p>
                  </div>
                </div>
                <div className="p-5 space-y-6">
                  <div className="flex gap-4">
                    <div className="text-[var(--text-secondary)] mt-0.5"><Globe size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        OpenRouter 
                        <span className="text-[10px] uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full font-bold">Recommended</span>
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                        Offers dozens of 100% free models like <code className="bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded font-mono text-[10px]">google/gemini-pro</code> and <code className="bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded font-mono text-[10px]">meta-llama/llama-3-8b-instruct:free</code>. 
                        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[var(--accent)] hover:underline font-medium inline-flex items-center gap-0.5">Get a free key <ExternalLink size={12} /></a>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-[var(--text-secondary)] mt-0.5"><Zap size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Groq</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                        Lightning fast Llama 3 inference with a very generous free tier. 
                        <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[var(--accent)] hover:underline font-medium inline-flex items-center gap-0.5">Get a free key <ExternalLink size={12} /></a>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-[var(--text-secondary)] mt-0.5"><Sparkles size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Google AI Studio</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                        1,500 free requests per day for Gemini 1.5 Pro and Flash. 
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[var(--accent)] hover:underline font-medium inline-flex items-center gap-0.5">Get a free key <ExternalLink size={12} /></a>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-[var(--text-secondary)] mt-0.5"><Server size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Ollama</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                        Run models locally for maximum privacy, or offload large models for free using Ollama Cloud. 
                        <a href="https://ollama.com/settings/keys" target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[var(--accent)] hover:underline font-medium inline-flex items-center gap-0.5">Get a free key <ExternalLink size={12} /></a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {(providerType === "custom" || providerType === "openrouter" || providerType === "ollama") && (
                <div className="space-y-3 max-w-2xl">
                  <label className="text-sm font-medium">Base URL</label>
                  <input
                    placeholder="e.g. https://openrouter.ai/api/v1"
                    value={form.endpoint}
                    onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
                    className="w-full rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
              )}

              <div className="space-y-3 max-w-2xl">
                <label className="text-sm font-medium">Select Model</label>
                {(providerType !== "custom" && providerType !== "openrouter") ? (
                  <select 
                    className="w-full rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const preset = (PRESETS as any)[providerType].find((p: any) => p.model_id === e.target.value);
                      if (preset) {
                        setForm(f => ({ ...f, model_id: preset.model_id, display_name: preset.display_name, context_window: preset.context_window }));
                      }
                    }}
                    value={(PRESETS as any)[providerType].some((p: any) => p.model_id === form.model_id) ? form.model_id : ""}
                  >
                    <option value="" disabled>Select a preset model...</option>
                    {(PRESETS as any)[providerType].map((p: any) => (
                      <option key={p.model_id} value={p.model_id}>{p.display_name}</option>
                    ))}
                  </select>
                ) : (
                  <select 
                    className="w-full rounded-md border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const m = fetchedModels.find(x => x.id === e.target.value);
                      if (m) {
                        setForm(f => ({ ...f, model_id: m.id, display_name: m.name || m.id, context_window: m.context_length || 128000 }));
                      } else {
                         setForm(f => ({ ...f, model_id: e.target.value }));
                      }
                    }}
                    value={form.model_id}
                  >
                    <option value="" disabled>{fetchedModels.length > 0 ? "Select a fetched model..." : "Fetch models first or manually enter below"}</option>
                    {fetchedModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name || m.id}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="max-w-2xl">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)} 
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  {showAdvanced ? "- Hide Advanced Settings" : "+ Show Advanced Settings (Manual Override)"}
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-2 gap-3 mt-3 p-3 rounded-md bg-[var(--surface)] border border-dashed">
                     <input
                      placeholder="Display name (e.g. Our GPT-4o)"
                      value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    <input
                      placeholder="Model ID (e.g. openai/gpt-4.1)"
                      value={form.model_id}
                      onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))}
                      className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    <input
                      placeholder="Provider (e.g. openai)"
                      value={form.provider}
                      onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                      className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    <input
                      type="number"
                      placeholder="Context window (tokens)"
                      value={form.context_window}
                      onChange={e => setForm(f => ({ ...f, context_window: Number(e.target.value) }))}
                      className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  disabled={!form.display_name || !form.model_id || add.isPending}
                  onClick={() => add.mutate()}
                >
                  {add.isPending ? "Adding..." : "Add Model"}
                </Button>
              </div>
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
              {data.models.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {m.name}
                      {m.is_critic && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold tracking-wider">Critic</span>}
                      {m.is_judge && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] uppercase font-bold tracking-wider">Judge</span>}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {m.id} · {m.provider} · {(m.context_window / 1000).toFixed(0)}K context
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4 text-xs font-medium">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!!m.is_critic} 
                            onChange={(e) => updateRole.mutate({ id: m.id, role: "is_critic", value: e.target.checked })}
                            disabled={updateRole.isPending}
                            className="accent-emerald-500 w-3.5 h-3.5"
                          />
                          Critic
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!!m.is_judge} 
                            onChange={(e) => updateRole.mutate({ id: m.id, role: "is_judge", value: e.target.checked })}
                            disabled={updateRole.isPending}
                            className="accent-blue-500 w-3.5 h-3.5"
                          />
                          Judge
                        </label>
                      </div>
                      <div className="w-px h-6 bg-[var(--border)]" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => remove.mutate(m.id)}
                        disabled={remove.isPending}
                      >
                        Remove
                      </Button>
                    </div>
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
