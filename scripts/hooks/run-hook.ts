import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Runs a governance hook the way the agent runtime does: the payload on stdin, the outcome read
 * from the exit code. A hook written against a guessed field name parses fine, matches nothing,
 * and exits zero on every run, which looks identical to a working hook until the one time it was
 * supposed to block something. These helpers exist so every hook is tested against the payload
 * shape it will really receive, in both its pass and its block case.
 */
export interface HookResult {
  exitCode: number
  stdout: string
  stderr: string
}

/** Resolved from this file rather than from the working directory, which vitest sets per package. */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export function runHook(hook: string, payload: unknown): HookResult {
  const result = spawnSync('node', [join(repoRoot, '.claude', 'hooks', hook)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: repoRoot },
  })
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

/** The payload shape a Bash tool call arrives with. */
export function bashPayload(command: string): Record<string, unknown> {
  return { tool_name: 'Bash', tool_input: { command } }
}

export const ALLOW = 0
export const BLOCK = 2
