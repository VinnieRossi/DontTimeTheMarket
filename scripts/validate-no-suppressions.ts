import { readFileSync } from 'node:fs'
import { filesToCheck } from './lib/git'
import { report } from './lib/proc'

/**
 * Blocks the escape hatches an agent reaches for when it cannot make something pass cleanly.
 * Each one looks like finished work and is not: a suppressed rule is a rule that stopped
 * applying, and nothing in the repository reports that it did.
 *
 * A rule that genuinely needs an exception is changed in the configuration, where it is
 * visible and reviewable, rather than silenced at one call site.
 */
const FORBIDDEN: readonly { pattern: RegExp; why: string }[] = [
  { pattern: /@ts-ignore/, why: 'silences the type checker without saying what it hid' },
  { pattern: /@ts-nocheck/, why: 'turns off type checking for a whole file' },
  {
    pattern: /@ts-expect-error/,
    why: 'belongs in a test that asserts a type error, not in source',
  },
  { pattern: /biome-ignore/, why: 'silences a lint rule at one call site' },
  { pattern: /eslint-disable/, why: 'silences a lint rule at one call site' },
  { pattern: /\bit\.(skip|todo)\b/, why: 'a skipped test counts as coverage of a case nobody ran' },
  {
    pattern: /\btest\.(skip|todo)\b/,
    why: 'a skipped test counts as coverage of a case nobody ran',
  },
  { pattern: /\bdescribe\.skip\b/, why: 'a skipped suite reads as a passing one' },
  { pattern: /\b(it|test|describe)\.only\b/, why: 'leaves the rest of the suite unrun' },
  { pattern: /\bTODO\b|\bFIXME\b/, why: 'deferred work with no owner and no ticket' },
]

const CHECKED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css']
const EXEMPT = ['.gen.', 'scripts/validate-no-suppressions.ts']

const staged = process.argv.includes('--staged')
const candidates = filesToCheck(staged).filter(
  (file) =>
    CHECKED_EXTENSIONS.some((extension) => file.endsWith(extension)) &&
    !EXEMPT.some((fragment) => file.includes(fragment))
)

const violations: string[] = []
for (const file of candidates) {
  let lines: string[]
  try {
    lines = readFileSync(file, 'utf8').split('\n')
  } catch {
    continue
  }
  lines.forEach((line, index) => {
    for (const { pattern, why } of FORBIDDEN) {
      if (pattern.test(line)) {
        violations.push(`${file}:${index + 1}: ${pattern.source} - ${why}`)
      }
    }
  })
}

// A check that silently inspected nothing reads exactly like a check that passed, so an empty
// candidate set is a failure in a full run rather than a quiet success.
if (!staged && candidates.length === 0) {
  violations.push('matched no files to inspect, so this check proved nothing')
}

report(
  'Suppressions',
  violations,
  `Suppressions: ${candidates.length} files carry no validator bypasses`
)
