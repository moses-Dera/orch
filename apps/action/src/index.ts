import * as core from "@actions/core"
import * as github from "@actions/github"
import { parseDiff, type FileDiff } from "./diff"
import { reviewFile, type ReviewResult } from "./review"
import { postComments, postSummary } from "./comments"
import { shouldIgnore } from "./ignore"

async function run(): Promise<void> {
  try {
    const apiKey     = core.getInput("api_key", { required: true })
    const apiUrl     = core.getInput("api_url")
    const failOnCrit = core.getInput("fail_on_critical") === "true"
    const failOnWarn = core.getInput("fail_on_warning") === "true"
    const model      = core.getInput("model")
    const domain     = core.getInput("domain")
    const maxFiles   = parseInt(core.getInput("max_files"), 10)
    const ignorePatterns = core.getInput("ignore_patterns").split(",").map((p: string) => p.trim()).filter(Boolean)

    const ctx = github.context
    const { pull_request } = ctx.payload

    if (!pull_request) {
      core.warning("Orch: not a pull_request event — skipping review.")
      return
    }

    const octokit = github.getOctokit(process.env["GITHUB_TOKEN"] ?? "")
    const { owner, repo } = ctx.repo
    const prNumber = pull_request.number
    const commitSha = pull_request.head.sha

    core.info(`Orch: reviewing PR #${prNumber} at ${commitSha}`)

    // Fetch the full PR diff
    const { data: diffText } = await octokit.rest.pulls.get({
      owner, repo,
      pull_number: prNumber,
      mediaType: { format: "diff" },
    }) as any

    // Parse diff into per-file chunks
    const files: FileDiff[] = parseDiff(diffText)
    core.info(`Orch: ${files.length} changed files detected`)

    // Filter ignored files
    const reviewable = files
      .filter(f => !shouldIgnore(f.filename, ignorePatterns))
      .filter(f => f.diff.trim().length > 0)
      .slice(0, maxFiles)

    if (reviewable.length === 0) {
      core.info("Orch: no reviewable files after filtering — skipping.")
      core.setOutput("total_issues", "0")
      core.setOutput("critical_count", "0")
      core.setOutput("warning_count", "0")
      core.setOutput("files_reviewed", "0")
      core.setOutput("clean", "true")
      return
    }

    core.info(`Orch: reviewing ${reviewable.length} files in parallel`)

    // Review all files in parallel
    const results: ReviewResult[] = await Promise.all(
      reviewable.map(f => reviewFile(f, { apiKey, apiUrl, model, domain }))
    )

    // Aggregate counts
    const totalIssues   = results.reduce((n, r) => n + r.issues.length, 0)
    const criticalCount = results.reduce((n, r) => n + r.issues.filter(i => i.severity === "critical").length, 0)
    const warningCount  = results.reduce((n, r) => n + r.issues.filter(i => i.severity === "warning").length, 0)
    const filesReviewed = results.length
    const clean         = totalIssues === 0

    core.info(`Orch: review complete — ${totalIssues} issues (${criticalCount} critical, ${warningCount} warnings)`)

    // Post inline review comments for each finding
    const resultsWithIssues = results.filter(r => r.issues.length > 0)
    if (resultsWithIssues.length > 0) {
      await postComments(octokit, { owner, repo, prNumber, commitSha, results: resultsWithIssues })
    }

    // Always post a summary comment
    await postSummary(octokit, { owner, repo, prNumber, results, filesReviewed })

    // Set outputs
    core.setOutput("total_issues",   String(totalIssues))
    core.setOutput("critical_count", String(criticalCount))
    core.setOutput("warning_count",  String(warningCount))
    core.setOutput("files_reviewed", String(filesReviewed))
    core.setOutput("clean",          String(clean))

    // Fail check if configured
    if (failOnCrit && criticalCount > 0) {
      core.setFailed(`Orch: ${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} found. Fix before merging.`)
      return
    }
    if (failOnWarn && warningCount > 0) {
      core.setFailed(`Orch: ${warningCount} warning${warningCount > 1 ? "s" : ""} found.`)
      return
    }

    if (clean) {
      core.info("Orch: all files clean ✓")
    }

  } catch (error: any) {
    core.setFailed(`Orch action failed: ${error.message}`)
  }
}

run()
