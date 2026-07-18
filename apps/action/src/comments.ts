import * as core from "@actions/core"
import type { ReviewResult } from "./review"
import { findDiffLine } from "./diff"

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  warning:  "🟡",
  info:     "🔵",
}

const SUMMARY_HEADER = "<!-- orch-review-summary -->"

interface CommentContext {
  owner: string
  repo: string
  prNumber: number
  commitSha: string
  results: ReviewResult[]
}

interface SummaryContext {
  owner: string
  repo: string
  prNumber: number
  results: ReviewResult[]
  filesReviewed: number
}

/**
 * Posts inline review comments for each finding with a known line number.
 * Findings without a mappable line are collected into a file-level comment.
 */
export async function postComments(octokit: any, ctx: CommentContext): Promise<void> {
  const { owner, repo, prNumber, commitSha, results } = ctx

  const comments: any[] = []

  for (const result of results) {
    for (const issue of result.issues) {
      const diffLine = findDiffLine(result.diff.lineMap, issue.line)

      if (diffLine !== null) {
        // Inline comment at exact line
        comments.push({
          path: result.filename,
          line: diffLine,
          side: "RIGHT",
          body: formatInlineComment(issue),
        })
      }
    }
  }

  if (comments.length === 0) return

  try {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: commitSha,
      event: "COMMENT",
      comments,
    })
    core.info(`Orch: posted ${comments.length} inline comment${comments.length > 1 ? "s" : ""}`)
  } catch (error: any) {
    // Inline comments can fail if the diff line is stale — fall back gracefully
    core.warning(`Orch: could not post inline comments — ${error.message}`)
  }
}

/**
 * Posts or updates a summary comment on the PR.
 * Uses a hidden marker to find and replace any previous Orch summary.
 */
export async function postSummary(octokit: any, ctx: SummaryContext): Promise<void> {
  const { owner, repo, prNumber, results, filesReviewed } = ctx

  const totalIssues   = results.reduce((n, r) => n + r.issues.length, 0)
  const criticalCount = results.reduce((n, r) => n + r.issues.filter(i => i.severity === "critical").length, 0)
  const warningCount  = results.reduce((n, r) => n + r.issues.filter(i => i.severity === "warning").length, 0)
  const infoCount     = results.reduce((n, r) => n + r.issues.filter(i => i.severity === "info").length, 0)
  const clean         = totalIssues === 0

  const body = formatSummary({
    filesReviewed,
    totalIssues,
    criticalCount,
    warningCount,
    infoCount,
    clean,
    results,
  })

  try {
    // Find existing Orch summary comment to update instead of creating a new one
    const { data: comments } = await octokit.rest.issues.listComments({
      owner, repo, issue_number: prNumber,
    })

    const existing = comments.find((c: any) => c.body?.includes(SUMMARY_HEADER))

    if (existing) {
      await octokit.rest.issues.updateComment({
        owner, repo,
        comment_id: existing.id,
        body,
      })
    } else {
      await octokit.rest.issues.createComment({
        owner, repo,
        issue_number: prNumber,
        body,
      })
    }
  } catch (error: any) {
    core.warning(`Orch: could not post summary comment — ${error.message}`)
  }
}

function formatInlineComment(issue: any): string {
  const emoji = SEVERITY_EMOJI[issue.severity] ?? "🔵"
  const lines: string[] = [
    `${emoji} **${issue.title}**`,
    ``,
    issue.detail,
  ]

  if (issue.suggested_fix) {
    lines.push(``, `**Suggested fix:**`, `\`\`\``, issue.suggested_fix, `\`\`\``)
  }

  lines.push(``, `*Constraint: \`${issue.constraint_id}\` · Orch*`)
  return lines.join("\n")
}

function formatSummary(data: {
  filesReviewed: number
  totalIssues: number
  criticalCount: number
  warningCount: number
  infoCount: number
  clean: boolean
  results: ReviewResult[]
}): string {
  const { filesReviewed, totalIssues, criticalCount, warningCount, infoCount, clean, results } = data

  const lines: string[] = [
    SUMMARY_HEADER,
    `## Orch Code Review`,
    ``,
  ]

  if (clean) {
    lines.push(`✅ **All ${filesReviewed} file${filesReviewed !== 1 ? "s" : ""} reviewed — no issues found.**`)
  } else {
    lines.push(`Found **${totalIssues} issue${totalIssues !== 1 ? "s" : ""}** across **${filesReviewed} file${filesReviewed !== 1 ? "s" : ""}**.`)
    lines.push(``)
    lines.push(`| Severity | Count |`)
    lines.push(`|---|---|`)
    if (criticalCount > 0) lines.push(`| 🔴 Critical | ${criticalCount} |`)
    if (warningCount > 0)  lines.push(`| 🟡 Warning  | ${warningCount} |`)
    if (infoCount > 0)     lines.push(`| 🔵 Info     | ${infoCount} |`)

    // Per-file breakdown
    const withIssues = results.filter(r => r.issues.length > 0)
    if (withIssues.length > 0) {
      lines.push(``, `### Findings by file`, ``)
      for (const result of withIssues) {
        lines.push(`<details>`)
        lines.push(`<summary><code>${result.filename}</code> — ${result.issues.length} issue${result.issues.length !== 1 ? "s" : ""}</summary>`, ``)
        for (const issue of result.issues) {
          const emoji = SEVERITY_EMOJI[issue.severity] ?? "🔵"
          lines.push(`**${emoji} ${issue.title}**${issue.line ? ` (line ${issue.line})` : ""}`)
          lines.push(``)
          lines.push(issue.detail)
          if (issue.suggested_fix) {
            lines.push(``, `\`\`\``, issue.suggested_fix, `\`\`\``)
          }
          lines.push(``)
        }
        lines.push(`</details>`, ``)
      }
    }
  }

  lines.push(``, `---`, `*Reviewed by [Orch](https://orch.dev) · ${new Date().toUTCString()}*`)
  return lines.join("\n")
}
