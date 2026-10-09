import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The rename touches every manifest, every import, and the dependency allowlist at once, so it is
 * tested rather than trusted: a rename that misses one file leaves a workspace that fails to
 * resolve, and the error points at the import rather than at the rename that caused it.
 */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const script = join(repoRoot, 'scripts', 'init-project.ts')
/** The script is run the way the package script runs it, rather than through a different loader. */
const tsx = join(repoRoot, 'node_modules', '.bin', 'tsx')

/** A throwaway repository with a few files that carry the template's name and scope. */
function makeProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'init-project-'))
  execFileSync('git', ['init', '--quiet'], { cwd: dir })

  mkdirSync(join(dir, 'packages', 'shared', 'types'), { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'app-quickstart', devDependencies: { '@app/config': 'workspace:*' } })
  )
  writeFileSync(
    join(dir, 'packages', 'shared', 'types', 'package.json'),
    JSON.stringify({ name: '@app/types' })
  )
  writeFileSync(
    join(dir, 'source.ts'),
    "import { ok } from '@app/types'\nexport const project = 'app-quickstart'\n"
  )
  writeFileSync(join(dir, 'pnpm-lock.yaml'), "packages:\n  '@app/types': {}\n")

  execFileSync('git', ['add', '-A'], { cwd: dir })
  return dir
}

function run(cwd: string, args: string[]): { status: number; output: string } {
  const result = spawnSync(tsx, [script, ...args], { cwd, encoding: 'utf8' })
  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}` }
}

describe('init-project', () => {
  it('rewrites the scope in manifests and in imports', () => {
    const dir = makeProject()
    expect(run(dir, ['--name', 'acme-platform', '--scope', '@acme']).status).toBe(0)

    expect(readFileSync(join(dir, 'packages/shared/types/package.json'), 'utf8')).toContain(
      '@acme/types'
    )
    expect(readFileSync(join(dir, 'source.ts'), 'utf8')).toContain('@acme/types')
  })

  it('rewrites the project name wherever it appears', () => {
    const dir = makeProject()
    run(dir, ['--name', 'acme-platform', '--scope', '@acme'])

    expect(readFileSync(join(dir, 'package.json'), 'utf8')).toContain('acme-platform')
    expect(readFileSync(join(dir, 'source.ts'), 'utf8')).toContain('acme-platform')
  })

  it('leaves the lockfile alone, because rewriting it would break its integrity hashes', () => {
    const dir = makeProject()
    run(dir, ['--name', 'acme-platform', '--scope', '@acme'])

    expect(readFileSync(join(dir, 'pnpm-lock.yaml'), 'utf8')).toContain('@app/types')
  })

  it('changes nothing on a dry run, but says what it would change', () => {
    const dir = makeProject()
    const result = run(dir, ['--name', 'acme-platform', '--scope', '@acme', '--dry-run'])

    expect(result.output).toContain('would be rewritten')
    expect(readFileSync(join(dir, 'source.ts'), 'utf8')).toContain('@app/types')
  })

  it('refuses a name or a scope that would not be a valid package name', () => {
    const dir = makeProject()
    expect(run(dir, ['--name', 'Acme Platform', '--scope', '@acme']).status).not.toBe(0)
    expect(run(dir, ['--name', 'acme', '--scope', 'acme']).status).not.toBe(0)
  })

  it('refuses to run with no arguments rather than guessing', () => {
    const dir = makeProject()
    const result = run(dir, [])
    expect(result.status).not.toBe(0)
    expect(result.output).toContain('usage:')
  })

  it('reformats afterward, because a scope of a different length moves where lines wrap', () => {
    const dir = makeProject()
    writeFileSync(
      join(dir, 'biome.json'),
      JSON.stringify({ formatter: { enabled: true, lineWidth: 100 } })
    )
    // A line that fits under the template's scope and does not fit under a longer one.
    writeFileSync(
      join(dir, 'graph.ts'),
      "export const deps = ['@app/contracts', '@app/database', '@app/validation', '@app/types']\n"
    )
    execFileSync('git', ['add', '-A'], { cwd: dir })

    run(dir, ['--name', 'acme-platform', '--scope', '@acme-platform-scope'])

    // Reformatting wrapped it, so the first gate run in the new project is not a formatting failure.
    expect(readFileSync(join(dir, 'graph.ts'), 'utf8').split('\n').length).toBeGreaterThan(2)
  })

  it('leaves formatting alone when the repository has no formatter configured', () => {
    const dir = makeProject()
    run(dir, ['--name', 'acme-platform', '--scope', '@acme'])

    // The fixture has no formatter configuration, so nothing but the rename was applied.
    expect(readFileSync(join(dir, 'source.ts'), 'utf8')).toContain("from '@acme/types'")
  })

  it('leaves the rename tool itself alone, so a renamed project still passes its own gate', () => {
    const dir = makeProject()
    mkdirSync(join(dir, 'scripts'), { recursive: true })
    writeFileSync(join(dir, 'scripts', 'init-project.ts'), "const CURRENT_SCOPE = '@app'\n")
    execFileSync('git', ['add', '-A'], { cwd: dir })

    run(dir, ['--name', 'acme-platform', '--scope', '@acme'])

    expect(readFileSync(join(dir, 'scripts/init-project.ts'), 'utf8')).toContain("'@app'")
  })

  it('refuses to rename the template to itself, which would be a no-op nobody meant', () => {
    const dir = makeProject()
    expect(run(dir, ['--name', 'app-quickstart', '--scope', '@app']).status).not.toBe(0)
  })

  it('prints the known gaps so a new project is alerted to them on creation', () => {
    const dir = makeProject()
    const result = run(dir, ['--name', 'acme-platform', '--scope', '@acme'])

    expect(result.output).toContain('Known gaps')
    expect(result.output).toContain('Production log shipping')
    expect(result.output).toContain('Error tracking')
    expect(result.output).toContain('Branch protection')
    expect(result.output).toContain('Real vendor adapters')
  })
})
