import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ALLOW, runHook } from './run-hook'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const HOOK = 'save-session.ts'

describe('save-session hook', () => {
  it('records the compaction under a directory keyed on the session', () => {
    const sessionId = `test-session-${Date.now()}`
    const result = runHook(HOOK, { session_id: sessionId })

    expect(result.exitCode).toBe(ALLOW)
    const log = join(repoRoot, '.claude', 'state', sessionId, 'compactions.log')
    expect(existsSync(log)).toBe(true)
    expect(readFileSync(log, 'utf8')).toContain('context compacted')
  })

  it('tells the agent what to write down, which is the whole point of this hook', () => {
    const result = runHook(HOOK, { session_id: `test-session-prompt-${Date.now()}` })
    expect(result.stdout).toContain('compacted')
  })

  it('still records something when the payload carries no session id', () => {
    expect(runHook(HOOK, {}).exitCode).toBe(ALLOW)
    expect(existsSync(join(repoRoot, '.claude', 'state', 'unknown-session'))).toBe(true)
  })
})
