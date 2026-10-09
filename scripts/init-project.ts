import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { heading, info, pass } from './lib/proc'

/**
 * Rename a project created from this template. Everything else in a fresh clone already works, so
 * this does one job: replace the placeholder name and the package scope with the real ones.
 *
 * It is deliberately a script rather than a documented list of files to edit, because the scope
 * appears in every manifest, every import, and the dependency allowlist, and a rename done by hand
 * leaves one of them behind and the mismatch surfaces as a confusing resolution error.
 *
 *   pnpm init-project --name my-project --scope @my-project
 *   pnpm init-project --name my-project --scope @my-project --dry-run
 */

const CURRENT_SCOPE = '@app'
const CURRENT_NAME = 'app-quickstart'

interface Options {
  name: string
  scope: string
  dryRun: boolean
}

function fail(message: string): never {
  console.error(`init-project: ${message}`)
  process.exit(1)
}

function parseOptions(argv: string[]): Options {
  const value = (flag: string): string | undefined => {
    const index = argv.indexOf(flag)
    return index === -1 ? undefined : argv[index + 1]
  }

  const name = value('--name')
  const scope = value('--scope')
  if (name === undefined || scope === undefined) {
    fail('usage: pnpm init-project --name <project-name> --scope <@scope> [--dry-run]')
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    fail(
      `the name "${name}" has to be lowercase letters, digits, and dashes, starting with a letter`
    )
  }
  if (!/^@[a-z][a-z0-9-]*$/.test(scope)) {
    fail(`the scope "${scope}" has to start with @, then lowercase letters, digits, and dashes`)
  }
  return { name, scope, dryRun: argv.includes('--dry-run') }
}

/** Tracked files only, so nothing in a build directory or a dependency is touched. */
function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * Binary and generated files are skipped. The migration snapshots are generated from the schema and
 * carry no scope, and rewriting a lockfile by hand would break its integrity hashes.
 *
 * This script and its test are skipped for a different reason: the names they carry describe what
 * a rename replaces rather than naming anything in the project. Rewriting them would leave the
 * script searching for a scope no longer present, and its test asserting on fixtures that no longer
 * match, so the first gate run in a renamed project would fail on the rename tool itself.
 */
const SKIP = [
  'pnpm-lock.yaml',
  'packages/backend/database/drizzle/',
  'scripts/init-project.ts',
  'scripts/init-project.test.ts',
  '.png',
  '.jpg',
  '.ico',
  '.woff',
]

function shouldRewrite(file: string): boolean {
  return !SKIP.some((fragment) => file.includes(fragment))
}

const options = parseOptions(process.argv.slice(2))

if (options.scope === CURRENT_SCOPE && options.name === CURRENT_NAME) {
  fail('that is already the template name and scope, so there is nothing to rename')
}

heading(`Renaming to ${options.name} with scope ${options.scope}`)
if (options.dryRun) info('dry run: nothing will be written')

const changed: string[] = []
for (const file of trackedFiles().filter(shouldRewrite)) {
  let contents: string
  try {
    contents = readFileSync(file, 'utf8')
  } catch {
    continue // a symlink pointing at a file that moved, or a file removed mid-run
  }

  const rewritten = contents
    .replaceAll(`${CURRENT_SCOPE}/`, `${options.scope}/`)
    .replaceAll(CURRENT_NAME, options.name)

  if (rewritten === contents) continue
  changed.push(file)
  if (!options.dryRun) writeFileSync(file, rewritten, 'utf8')
}

for (const file of changed) info(file)
pass(`${changed.length} files ${options.dryRun ? 'would be' : 'were'} rewritten`)

if (!options.dryRun) {
  /**
   * Reformat afterward, because a scope of a different length moves where lines wrap. Without this
   * the first gate run in a new project fails on formatting alone, which teaches its new owner that
   * a red gate is the normal state of the repository.
   *
   * Only when the repository has a formatter configured. Running one without its configuration
   * would apply somebody else's defaults to every file, which is a far larger change than the
   * rename that asked for it.
   */
  if (existsSync('biome.json')) {
    heading('Reformatting')
    const formatted = spawnSync('pnpm', ['exec', 'biome', 'check', '--write', '.'], {
      stdio: 'inherit',
    })
    if ((formatted.status ?? 1) !== 0) {
      fail('the rename is written, but reformatting failed. Run pnpm lint:fix and read the result.')
    }
    pass('formatting settled')
  }

  heading('Next')
  info('1. pnpm install, so the workspace links resolve under the new scope')
  info('2. pnpm verify, which should pass before you write anything of your own')
  info('3. Rewrite docs/architecture.md for what you are actually building')
  info('4. Replace the note example with your first real feature, and delete what is left of it')

  heading('Known gaps (see the README for detail)')
  info('- Production log shipping: logs go to the console only, nowhere else yet')
  info('- Error tracking: nothing reports an unhandled exception anywhere yet')
  info('- Branch protection: nothing here can require CI to pass before a merge yet')
  info('- Real vendor adapters: every external capability is a fake until one is wired')
}
