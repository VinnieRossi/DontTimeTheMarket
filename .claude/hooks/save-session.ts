#!/usr/bin/env node
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { allow, parsePayload, projectDir, readStdin } from './lib.ts'

/**
 * Records that a compaction happened, and where, so a session resuming afterward has something
 * durable to read rather than a summary of a conversation it can no longer see.
 *
 * State is keyed on the project directory plus the session id, because a relative path resolves
 * against whatever directory the hook fired from, and a worktree moves that. The pairing is the
 * one thing stable across both a changed working directory and the process churn a session
 * generates.
 *
 * Wired at PreCompact.
 */
const payload = parsePayload(await readStdin())
const session = payload.session_id ?? 'unknown-session'
const stateDir = join(projectDir(), '.claude', 'state', session)

mkdirSync(stateDir, { recursive: true })
appendFileSync(
  join(stateDir, 'compactions.log'),
  `${new Date().toISOString()} context compacted\n`,
  'utf8'
)

console.log(
  'Context is about to be compacted. Write what a fresh session would need into the run notes: what is done, what is next, which files are mid-edit, and any decision that is not yet in the code.'
)
allow()
