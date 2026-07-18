import * as core from "@actions/core"
import * as crypto from "crypto"
import type { FileDiff } from "./diff"

export interface ReviewIssue {
  severity: "critical" | "warning" | "info"
  line: number | null
  title: string
  detail: string
  constraint_id: string
  suggested_fix: string | null
}

export interface ReviewResult {
  filename: string
  diff: FileDiff
  domain: string
  model: string
  issues: ReviewIssue[]
  summary: string
  clean: boolean
  cached?: boolean
  error?: string
}

interface ReviewOptions {
  apiKey: string
  apiUrl: string
  model: string
  domain: string
}

// In-memory cache for this action run
// Key: sha256(filename + diff content)
// Prevents duplicate API calls when the same file appears in multiple pushes
const _runCache = new Map<string, ReviewResult>()

function _cacheKey(filename: string, diff: string): string {
  return crypto.createHash("sha256").update(`${filename}::${diff}`).digest("hex")
}

export async function reviewFile(file: FileDiff, opts: ReviewOptions): Promise<ReviewResult> {
  const { apiKey, apiUrl, model, domain } = opts

  // Check in-memory run cache first
  const key = _cacheKey(file.filename, file.diff)
  const cached = _runCache.get(key)
  if (cached) {
    core.info(`Orch: ${file.filename} — cached (${cached.issues.length} issues)`)
    return { ...cached, cached: true }
  }

  try {
    const res = await fetch(`${apiUrl}/api/v1/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        filename: file.filename,
        diff: file.diff,
        domain,
        model,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any
      const message = err?.detail?.message ?? err?.detail ?? `HTTP ${res.status}`
      core.warning(`Orch: failed to review ${file.filename} — ${message}`)
      return {
        filename: file.filename,
        diff: file,
        domain: "unknown",
        model: "unknown",
        issues: [],
        summary: message,
        clean: true,
        error: message,
      }
    }

    const data = await res.json() as any
    const fromServerCache = res.headers.get("x-orch-cached") === "true"
    core.info(`Orch: ${file.filename} — ${data.issues?.length ?? 0} issues${fromServerCache ? " (server cache)" : ""}`)

    const result: ReviewResult = {
      filename: file.filename,
      diff: file,
      domain: data.domain_identified ?? domain,
      model: data.model_executed ?? model,
      issues: data.issues ?? [],
      summary: data.summary ?? "",
      clean: data.clean ?? true,
    }

    // Store in run cache
    _runCache.set(key, result)
    return result

  } catch (error: any) {
    core.warning(`Orch: network error reviewing ${file.filename} — ${error.message}`)
    return {
      filename: file.filename,
      diff: file,
      domain: "unknown",
      model: "unknown",
      issues: [],
      summary: "Review failed due to network error.",
      clean: true,
      error: error.message,
    }
  }
}
