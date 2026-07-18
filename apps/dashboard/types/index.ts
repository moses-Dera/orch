export type Role = "owner" | "admin" | "member" | "viewer"
export type ModelPolicy = "enforced" | "allowlist" | "open"
export type HealthStatus = "healthy" | "warning" | "critical"
export type Severity = "critical" | "warning" | "info"
export type KeySource = "developer_personal" | "team_config" | "env_fallback"
export type Domain = "auto" | "backend" | "cyber" | "blockchain" | "general"

export interface OrgStatus {
  org: string
  team: string
  model_policy: ModelPolicy
  enforced_model: string | null
  constraint_profiles: ConstraintProfile[]
}

export interface ConstraintProfile {
  id: string
  description: string
  version: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  context_window: number
}

export interface ModelsResponse {
  policy: ModelPolicy
  models: ModelInfo[]
}

export interface OrchResponse {
  domain_identified: string
  model_executed: string
  session_id: string
  structured_output: string
  input_tokens: number
  output_tokens: number
  key_source: KeySource
}

export interface ReviewIssue {
  severity: Severity
  line: number | null
  title: string
  detail: string
  constraint_id: string
  suggested_fix: string | null
}

export interface ReviewResponse {
  filename: string
  domain_identified: string
  model_executed: string
  issues: ReviewIssue[]
  summary: string
  clean: boolean
}

export interface Member {
  id: string
  email: string
  role: Role
  teamId: string
}

export interface ApiKey {
  id: string
  key: string
  label: string
  isActive: boolean
  createdAt: string
  memberId: string | null
}

export interface Session {
  session_id: string
  created_at: string
  constraint_version: string | null
  developer: {
    member_id: string | null
    email: string
    name: string | null
    role: string | null
  }
  models_used: string[]
  total_messages: number
  total_input_tokens: number
  total_output_tokens: number
}

export interface SessionMessage {
  id: number
  role: string
  content: string
  model_used: string | null
  input_tokens: number
  output_tokens: number
  created_at: string
}

export interface SessionDetail extends Session {
  messages: SessionMessage[]
}

export interface AuditLog {
  org: string
  total_sessions: number
  total_input_tokens: number
  total_output_tokens: number
  developer_breakdown: DeveloperStat[]
  sessions: Session[]
}

export interface DeveloperStat {
  email: string
  name: string | null
  member_id: string | null
  sessions: number
  total_input_tokens: number
  total_output_tokens: number
  models_used: string[]
}

export interface HealthScore {
  constraint_id: string
  health_score: number
  override_rate: number
  total_requests: number
  total_overrides: number
  status: HealthStatus
  recommendation: string | null
  last_computed: string
}

export interface HealthResponse {
  org: string
  scores: HealthScore[]
  summary: {
    total_constraints: number
    healthy: number
    warning: number
    critical: number
  }
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  domain?: string
  model?: string
}
