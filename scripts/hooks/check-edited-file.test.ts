import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALLOW, BLOCK, runHook } from './run-hook'

const HOOK = 'check-edited-file.ts'

function tempFile(name: string, contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'hook-check-'))
  const path = join(dir, name)
  writeFileSync(path, contents, 'utf8')
  return path
}

describe('post-edit quality check', () => {
  it('allows a file that already satisfies the lint rules', () => {
    const path = tempFile('clean.ts', "export const value = 'ok'\n")
    expect(runHook(HOOK, { tool_name: 'Write', file_path: path }).exitCode).toBe(ALLOW)
  })

  it('blocks a file that breaks a lint rule, and says what to fix', () => {
    const escapeHatch = ['export function identity(value:', 'any) {', '  return value', '}'].join(
      ' '
    )
    const path = tempFile('broken.ts', `${escapeHatch}\n`)
    const result = runHook(HOOK, { tool_name: 'Write', file_path: path })
    expect(result.exitCode).toBe(BLOCK)
    expect(result.stdout).toContain('Lint failed')
  })

  it('ignores a file type it does not check', () => {
    const path = tempFile('notes.txt', 'anything at all\n')
    expect(runHook(HOOK, { tool_name: 'Write', file_path: path }).exitCode).toBe(ALLOW)
  })

  it('ignores a path that no longer exists, since an edit can be undone before this runs', () => {
    const gone = join(tmpdir(), 'hook-check-missing', 'gone.ts')
    expect(runHook(HOOK, { tool_name: 'Write', file_path: gone }).exitCode).toBe(ALLOW)
  })

  it('allows a payload with no file path', () => {
    expect(runHook(HOOK, { tool_name: 'Write' }).exitCode).toBe(ALLOW)
  })
})
