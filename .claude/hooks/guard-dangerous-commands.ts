#!/usr/bin/env node
import { allow, bashCommand, block, parsePayload, readStdin } from './lib.ts'

/**
 * Blocks shell commands whose damage cannot be undone, before they run. This guard fails
 * closed: when a command is ambiguous it blocks, because a false block costs a turn while a
 * false allow can cost the repository.
 *
 * Wired at PreToolUse on Bash.
 */
const FORBIDDEN: readonly { pattern: RegExp; reason: string }[] = [
  {
    pattern: /git\s+(commit|merge|rebase|cherry-pick)[^\n]*--no-verify/,
    reason:
      'Skipping verification is never allowed. A commit that cannot pass the gate is information: read the failure and fix its cause.',
  },
  {
    pattern: /git\s+push[^\n]*--force(?!-with-lease)/,
    reason:
      'A plain force push can discard commits nobody has a copy of. Use --force-with-lease, and only on a branch you own.',
  },
  {
    pattern: /git\s+push[^\n]*\s(main|master)\b/,
    reason: 'Pushing straight to the default branch skips review. Open a pull request instead.',
  },
  {
    pattern: /git\s+reset\s+--hard/,
    reason:
      'A hard reset destroys uncommitted work with no way back. Commit or stash first, then reset.',
  },
  {
    pattern: /git\s+clean\s+-[a-z]*f/,
    reason: 'git clean -f deletes untracked files permanently. List them first and delete by name.',
  },
  {
    pattern: /\brm\s+(-[a-zA-Z]*\s+)*-?[a-zA-Z]*r[a-zA-Z]*f|\brm\s+-f[a-zA-Z]*r/,
    reason:
      'A recursive force delete is not recoverable. Delete the specific paths you mean, or move them aside.',
  },
  {
    pattern: /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)\b/i,
    reason:
      'A schema change belongs in a migration, where it is reviewable and replayable, not in an ad hoc command.',
  },
  {
    pattern: /\bchmod\s+(-R\s+)?777\b/,
    reason: 'Mode 777 makes a path world-writable. Grant the narrowest permission that works.',
  },
  {
    pattern: /curl[^\n]*\|\s*(sh|bash|zsh)\b/,
    reason:
      'Piping a download into a shell runs code nobody read. Download it, read it, then run it.',
  },
]

const payload = parsePayload(await readStdin())
const command = bashCommand(payload)

if (command === '') allow()

for (const { pattern, reason } of FORBIDDEN) {
  if (pattern.test(command)) block(`Blocked: ${reason}`)
}

allow()
