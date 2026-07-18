"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/button"
import { HealthBadge } from "@/components/shared/HealthBadge"
import { useModels } from "@/hooks/useOrchStatus"
import { useHasAccess } from "@/hooks/useRole"
import { api } from "@/lib/api"
import type { ReviewResponse } from "@/types"
import { toast } from "sonner"

export default function AuditPage() {
  const [code, setCode] = useState("")
  const [filename, setFilename] = useState("")
  const [result, setResult] = useState<ReviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const { data: modelsData } = useModels()
  const isAdmin = useHasAccess("admin")
  const hasModels = (modelsData?.models.length ?? 0) > 0
  const router = useRouter()

  async function runAudit() {
    if (!code.trim() || !filename.trim()) {
      toast.error("Enter a filename and paste your code.")
      return
    }
    setLoading(true)
    try {
      const res = await api.review({ filename, diff: code, domain: "auto", model: "auto" })
      setResult(res)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Audit" description="Paste code to audit it against your org's constraints.">

      {!hasModels ? (
        <div className="rounded-lg border bg-[var(--surface)] flex items-center justify-center p-12">
          <div className="max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto">
              <span className="text-xl">⚡</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">No model configured</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {isAdmin
                  ? "Add a model with an API key to run code audits."
                  : "Your admin hasn't configured a model yet."}
              </p>
            </div>
            {isAdmin && (
              <Button onClick={() => router.push("/models")} size="sm">
                Add a model →
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6" style={{ height: "calc(100vh - 200px)" }}>

          {/* Input */}
          <div className="flex flex-col gap-3">
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Filename (e.g. auth.py)"
              className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
              className="flex-1 resize-none rounded-md border bg-[var(--background)] px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <Button onClick={runAudit} disabled={loading}>
              {loading ? "Auditing..." : "Run Audit"}
            </Button>
          </div>

          {/* Results */}
          <div className="rounded-lg border bg-[var(--surface)] overflow-y-auto">
            {!result ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-[var(--text-secondary)]">Paste code and run an audit to see issues.</p>
              </div>
            ) : result.clean ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-[var(--success)]">No issues found</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{result.summary}</p>
              </div>
            ) : (
              <div className="divide-y">
                <div className="px-5 py-4">
                  <p className="text-sm font-medium">{result.summary}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{result.issues.length} issue{result.issues.length !== 1 ? "s" : ""} found</p>
                </div>
                {result.issues.map((issue, i) => (
                  <div key={i} className="px-5 py-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <HealthBadge status={issue.severity === "critical" ? "critical" : issue.severity === "warning" ? "warning" : "healthy"} />
                      <span className="text-sm font-medium">{issue.title}</span>
                      {issue.line && <span className="text-xs text-[var(--text-secondary)]">Line {issue.line}</span>}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{issue.detail}</p>
                    {issue.suggested_fix && (
                      <pre className="text-xs bg-[var(--background)] rounded p-3 overflow-x-auto">{issue.suggested_fix}</pre>
                    )}
                    <p className="text-xs text-[var(--text-secondary)]">Constraint: {issue.constraint_id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
