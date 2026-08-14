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
  status: () => req<OrgStatus>("/v1/dashboard/status"),

  models: () => req<ModelsResponse>("/v1/dashboard/models"),

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
    return req<AuditLog>(`/v1/dashboard/audit?${qs}`)
  },

  mySessions: (limit = 50) =>
    req<{ sessions: AuditLog["sessions"] }>(`/v1/dashboard/audit/me?limit=${limit}`),

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

  health: () => req<HealthResponse>("/v1/dashboard/health/scores"),

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
  }) => req("/v1/dashboard/models", { method: "POST", body: JSON.stringify(body) }),

  removeModel: (configId: string) =>
    req(`/v1/dashboard/models/${configId}`, { method: "DELETE" }),

  updateModel: (id: string, body: { is_critic?: boolean; is_judge?: boolean }) =>
    req(`/v1/dashboard/models/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  listConstraints: () => req<{ constraints: any[] }>("/v1/dashboard/constraints"),

  upsertConstraint: (id: string, body: {
    id: string
    description: string
    constraints: string
    gpt_variant?: string
    claude_variant?: string
    gemini_variant?: string
    version: string
  }) => req(`/v1/dashboard/constraints/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  deleteConstraint: (id: string) =>
    req(`/v1/dashboard/constraints/${id}`, { method: "DELETE" }),

  generateKey: (params: { team_id: string; member_id?: string; label?: string }) => {
    const qs = new URLSearchParams({ team_id: params.team_id })
    if (params.member_id) qs.set("member_id", params.member_id)
    if (params.label) qs.set("label", params.label)
    return req<{ key: string; hint: string }>(`/v1/keys/generate?${qs}`, { method: "POST" })
  },

  setGithubInstallation: (installation_id: string) => req("/v1/dashboard/teams/github", {
    method: "POST",
    body: JSON.stringify({ installation_id }),
  }),

  listProjects: () => req<{ projects: any[] }>("/v1/dashboard/projects"),
  createProject: (body: { name: string; githubRepoFullName: string }) => req("/v1/dashboard/projects", {
    method: "POST",
    body: JSON.stringify(body),
  }),

  getAnalytics: () => req<{ stats: any; recent: any[] }>("/v1/dashboard/analytics"),

  registry: () => req<{ models: any[]; providers: string[] }>("/v1/dashboard/registry"),

  renameOrg: (orgId: string, name: string) =>
    req("/v1/onboarding/rename-org", { method: "PATCH", body: JSON.stringify({ org_id: orgId, name }) }),

  renameTeam: (teamId: string, name: string) =>
    req("/v1/onboarding/rename-team", { method: "PATCH", body: JSON.stringify({ team_id: teamId, name }) }),
}

