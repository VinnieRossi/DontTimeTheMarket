import { readFileSync } from 'node:fs'
import { filesToCheck } from './lib/git'
import { report } from './lib/proc'

/**
 * Two writing rules that hold across code, comments, documentation, and copy, kept mechanical
 * because a style rule nobody checks is a style rule that drifts one file at a time.
 *
 * The em dash is banned because it is the single most reliable tell of generated prose, and a
 * plain dash reads the same. American spellings are required so the whole repository agrees
 * with itself rather than varying by whoever wrote each file.
 */
const EM_DASH = '—'
const EN_DASH = '–'

/** British spellings and their American forms. Word-boundary matched, case-insensitive. */
const SPELLINGS: readonly [RegExp, string][] = [
  [/\bbehaviour(s|al)?\b/i, 'behavior'],
  [/\bcolour(s|ed|ing)?\b/i, 'color'],
  [/\bcentre(s|d)?\b/i, 'center'],
  [/\bfavour(s|ed|ite|ites)?\b/i, 'favor'],
  [/\bcancelled\b/i, 'canceled'],
  [/\bcancelling\b/i, 'canceling'],
  [/\bcatalogue(s|d)?\b/i, 'catalog'],
  [/\bdefence(s)?\b/i, 'defense'],
  [/\blicence(s|d)?\b/i, 'license'],
  [/\borganis(e|ed|es|ing|ation|ations)\b/i, 'organize'],
  [/\bauthoris(e|ed|es|ing|ation)\b/i, 'authorize'],
  [/\bnormalis(e|ed|es|ing|ation)\b/i, 'normalize'],
  [/\bserialis(e|ed|es|ing|ation)\b/i, 'serialize'],
  [/\bsynchronis(e|ed|es|ing|ation)\b/i, 'synchronize'],
  [/\bfulfil\b/i, 'fulfill'],
  [/\bwhilst\b/i, 'while'],
  [/\btravelled\b/i, 'traveled'],
  [/\bmodelling\b/i, 'modeling'],
]

const CHECKED_EXTENSIONS = ['.ts', '.tsx', '.css', '.md', '.json', '.yml', '.yaml']
const EXEMPT = ['/drizzle/', '.gen.', 'pnpm-lock.yaml', 'scripts/validate-writing.ts']

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
    const where = `${file}:${index + 1}`
    if (line.includes(EM_DASH) || line.includes(EN_DASH)) {
      violations.push(`${where}: uses a long dash. Write a plain dash instead.`)
    }
    for (const [pattern, american] of SPELLINGS) {
      const match = pattern.exec(line)
      if (match) {
        violations.push(`${where}: "${match[0]}" is British spelling. Use "${american}".`)
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
  'Writing',
  violations,
  `Writing: ${candidates.length} files use plain dashes and American spelling`
)
