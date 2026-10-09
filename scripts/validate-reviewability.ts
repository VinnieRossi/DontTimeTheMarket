import { readFileSync } from 'node:fs'
import { filesToCheck } from './lib/git'
import { report } from './lib/proc'

/**
 * Orchestration files stay small enough to hold in one reading. A page or route that keeps
 * growing is holding logic that belongs in a hook or a service, and a source file past a few
 * hundred lines costs an agent most of its context just to understand one screen.
 */
const SOURCE_LIMIT = 500
const ORCHESTRATION_LIMIT = 200

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.css']
const EXEMPT = ['.gen.', '/storybook-static/', '/dist/', '/.next/']

/** Page, layout, and route files: the composition layer, held to the tighter limit. */
function isOrchestration(file: string): boolean {
  return /(^|\/)app\/.*\/(page|layout|route|template|default|loading|error|not-found)\.tsx?$/.test(
    file
  )
}

const staged = process.argv.includes('--staged')
const candidates = filesToCheck(staged).filter(
  (file) =>
    SOURCE_EXTENSIONS.some((extension) => file.endsWith(extension)) &&
    !EXEMPT.some((fragment) => file.includes(fragment))
)

const violations: string[] = []
for (const file of candidates) {
  let lines: number
  try {
    lines = readFileSync(file, 'utf8').split('\n').length
  } catch {
    continue // removed between staging and this check
  }
  const limit = isOrchestration(file) ? ORCHESTRATION_LIMIT : SOURCE_LIMIT
  if (lines > limit) {
    violations.push(`${file}: ${lines} lines, over the ${limit}-line limit. Split it by concern.`)
  }
}

// A check that silently inspected nothing reads exactly like a check that passed, so an empty
// candidate set is a failure in a full run rather than a quiet success.
if (!staged && candidates.length === 0) {
  violations.push('matched no files to inspect, so this check proved nothing')
}

report(
  'Reviewability',
  violations,
  `Reviewability: ${candidates.length} source files inside their line limits`
)
