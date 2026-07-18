import type {
  OrgStatus, ModelsResponse, OrchResponse,
  ReviewResponse, AuditLog, HealthResponse, SessionDetail
} from "@/types"

const BASE = "/api/orch"

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const message = err?.detail?.message ?? err?.detail ?? err?.message ?? `HTTP ${res.status}`
    throw new Error(message)
  }
  return res.json()
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return req<T>(path, options)
}

export const api = {
  status: () => req<OrgStatus>("/v1/status"),

  models: () => req<ModelsResponse>("/v1/models"),

  ask: (body: {
    user_prompt: string
    domain: string
    model: string
    session_id: string | null
  }) => req<OrchResponse>("/v1/orchestrate", {
    method: "POST",
    body: JSON.stringify(body),
  }),

  review: (body: {
    filename: string
    diff: string
    domain: string
    model: string
  }) => req<ReviewResponse>("/v1/review", {
    method: "POST",
    body: JSON.stringify(body),
  }),

  auditLog: (params?: { member_id?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.member_id) qs.set("member_id", params.member_id)
    if (params?.limit) qs.set("limit", String(params.limit))
    return req<AuditLog>(`/v1/audit?${qs}`)
  },

  mySessions: (limit = 50) =>
    req<{ sessions: AuditLog["sessions"] }>(`/v1/audit/me?limit=${limit}`),

  session: (sessionId: string) =>
    req<SessionDetail>(`/v1/audit/${sessionId}`),

  coverage: () =>
    req<{
      repos_covered: number
      github_orgs_connected: number
      reviews_last_30_days: number
      total_reviews_all_time: number
      active_developers_last_30_days: number
      daily_chart: { date: string; reviews: number }[]
    }>(`/v1/github/coverage`),

  health: () => req<HealthResponse>("/v1/health/scores"),

  logOverride: (body: {
    constraint_id: string
    session_id: string
    model_used: string
    reason: string
  }) => req("/v1/health/override", {
    method: "POST",
    body: JSON.stringify(body),
  }),

  addModel: (body: {
    display_name: string
    provider: string
    model_id: string
    endpoint?: string
    api_key?: string
    context_window: number
  }) => req("/v1/models", { method: "POST", body: JSON.stringify(body) }),

  removeModel: (configId: string) =>
    req(`/v1/models/${configId}`, { method: "DELETE" }),

  listConstraints: () => req<{ constraints: any[] }>("/v1/constraints"),

  upsertConstraint: (id: string, body: {
    id: string
    description: string
    constraints: string
    gpt_variant?: string
    claude_variant?: string
    gemini_variant?: string
    version: string
  }) => req(`/v1/constraints/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  deleteConstraint: (id: string) =>
    req(`/v1/constraints/${id}`, { method: "DELETE" }),

  generateKey: (params: { team_id: string; member_id?: string; label?: string }) => {
    const qs = new URLSearchParams({ team_id: params.team_id })
    if (params.member_id) qs.set("member_id", params.member_id)
    if (params.label) qs.set("label", params.label)
    return req<{ key: string; hint: string }>(`/v1/keys/generate?${qs}`, { method: "POST" })
  },

  registry: () => req<{ models: any[]; providers: string[] }>("/v1/registry"),
}
