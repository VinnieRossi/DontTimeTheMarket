import { lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { join } from 'node:path'
import { trackedFiles } from './lib/git'
import { report } from './lib/proc'

/**
 * Governance for the instruction layer. Three things have to hold, and none of them is
 * self-evident from reading the files:
 *
 * AGENTS.md is the one real file and every tool-specific name is a symlink to it, because a
 * copy diverges the first time somebody edits one and not the other, and nothing reports which
 * copy went stale.
 *
 * The root file stays inside its length budget, because a file that runs to hundreds of lines
 * gets skimmed rather than read, and a skimmed instruction file may as well not exist.
 *
 * The root file indexes every package-level instruction file, because an agent starting at the
 * root would otherwise have to guess which directories carry their own rules.
 *
 * Every check here works off what git tracks rather than what the working tree happens to
 * contain, because a generator that writes its own untracked `AGENTS.md` or `CLAUDE.md` next to
 * one this repository owns (`next dev` does exactly this in `apps/web`) is not part of what CI or
 * a fresh clone ever sees.
 */
const ROOT_MIN_LINES = 60
const ROOT_MAX_LINES = 100
const LINKED_NAMES = ['CLAUDE.md', 'GEMINI.md']

const violations: string[] = []
const tracked = new Set(trackedFiles())

function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

/** Every tracked AGENTS.md below the root, which is the set the root has to index. */
function instructionFiles(): string[] {
  return [...tracked].filter((file) => file.endsWith('/AGENTS.md'))
}

function checkLinks(dir: string): void {
  for (const name of LINKED_NAMES) {
    const path = join(dir, name)
    if (!tracked.has(path)) continue
    if (!isSymlink(path)) {
      violations.push(`${path} is a regular file. It has to be a symlink to AGENTS.md.`)
      continue
    }
    if (readlinkSync(path) !== 'AGENTS.md') {
      violations.push(`${path} points at ${readlinkSync(path)} rather than AGENTS.md.`)
    }
  }
}

if (!tracked.has('AGENTS.md')) {
  violations.push('AGENTS.md is missing from the repository root.')
} else if (isSymlink('AGENTS.md')) {
  violations.push(
    'AGENTS.md at the root is a symlink. It is the real file everything else links to.'
  )
} else {
  const root = readFileSync('AGENTS.md', 'utf8')
  const lines = root.trimEnd().split('\n').length
  if (lines < ROOT_MIN_LINES || lines > ROOT_MAX_LINES) {
    violations.push(
      `AGENTS.md is ${lines} lines, outside the ${ROOT_MIN_LINES} to ${ROOT_MAX_LINES} line budget.`
    )
  }
  if (!tracked.has('CLAUDE.md')) {
    violations.push('CLAUDE.md is missing. It has to exist as a symlink to AGENTS.md.')
  }
  for (const file of instructionFiles()) {
    if (!root.includes(file)) {
      violations.push(`AGENTS.md does not index ${file}, so an agent cannot know it exists.`)
    }
  }
}

checkLinks('.')
for (const file of instructionFiles()) {
  checkLinks(join(file, '..'))
}

const indexed = tracked.has('AGENTS.md') ? instructionFiles().length : 0
report(
  'Instructions',
  violations,
  `Instructions: root file within budget, ${indexed} package files indexed, symlinks resolve`
)
