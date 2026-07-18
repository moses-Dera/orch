export interface FileDiff {
  filename: string
  diff: string
  // Maps diff line index → actual file line number for inline comments
  lineMap: Map<number, number>
}

/**
 * Parses a unified diff string into per-file chunks.
 * Handles renamed files, binary files, and empty diffs gracefully.
 */
export function parseDiff(raw: string): FileDiff[] {
  const files: FileDiff[] = []
  const fileBlocks = raw.split(/^diff --git /m).filter(Boolean)

  for (const block of fileBlocks) {
    const lines = block.split("\n")

    // Extract filename from "a/path b/path" header
    const header = lines[0] ?? ""
    const match = header.match(/^a\/(.+?) b\/(.+)$/)
    if (!match) continue

    const filename = match[2] // use the "b" (new) filename

    // Skip binary files
    if (lines.some(l => l.startsWith("Binary files"))) continue

    // Build line map: diff line index → file line number
    const lineMap = new Map<number, number>()
    let fileLineNumber = 0
    let diffLineIndex = 0

    const diffLines: string[] = []

    for (const line of lines) {
      // Hunk header: @@ -old_start,old_count +new_start,new_count @@
      const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (hunkMatch) {
        fileLineNumber = parseInt(hunkMatch[1], 10) - 1
        diffLines.push(line)
        diffLineIndex++
        continue
      }

      if (line.startsWith("+") && !line.startsWith("+++")) {
        fileLineNumber++
        lineMap.set(diffLineIndex, fileLineNumber)
        diffLines.push(line)
        diffLineIndex++
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        diffLines.push(line)
        diffLineIndex++
      } else if (!line.startsWith("---") && !line.startsWith("+++")) {
        fileLineNumber++
        diffLines.push(line)
        diffLineIndex++
      }
    }

    const diff = diffLines.join("\n").trim()
    if (diff) {
      files.push({ filename, diff, lineMap })
    }
  }

  return files
}

/**
 * Given a file line number from a review finding,
 * find the closest diff line index for posting an inline comment.
 */
export function findDiffLine(lineMap: Map<number, number>, targetLine: number | null): number | null {
  if (!targetLine) return null

  // Exact match
  for (const [diffLine, fileLine] of lineMap) {
    if (fileLine === targetLine) return diffLine
  }

  // Closest line in the diff
  let closest: number | null = null
  let minDist = Infinity
  for (const [diffLine, fileLine] of lineMap) {
    const dist = Math.abs(fileLine - targetLine)
    if (dist < minDist) {
      minDist = dist
      closest = diffLine
    }
  }

  return closest
}
