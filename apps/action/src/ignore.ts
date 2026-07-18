import { minimatch } from "minimatch"

/**
 * Returns true if the filename matches any of the ignore patterns.
 * Patterns are standard globs (e.g. "*.md", "tests/**", "src/generated/*").
 */
export function shouldIgnore(filename: string, patterns: string[]): boolean {
  return patterns.some(pattern =>
    minimatch(filename, pattern, { matchBase: true, dot: true })
  )
}
