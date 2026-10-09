#!/usr/bin/env node
import { allow, bashCommand, block, parsePayload, readStdin } from './lib.ts'

/**
 * Blocks a tool call that would read a credential file, or write something credential-shaped
 * into a tracked file. A secret reaches logs, transcripts, and diffs far more readily than it
 * reaches a database, so the cheapest place to stop one is before the call that moves it.
 *
 * Two scoping decisions keep this guard usable rather than merely strict. It blocks reads of a
 * credential file but not writes to one, because copying the example file into a local
 * environment file is the documented first step of setting the project up. And it skips the
 * content check on test files, because a test proving this guard blocks a credential shape has
 * to contain that shape.
 *
 * Wired at PreToolUse on Read, Write, Edit, MultiEdit, and Bash.
 */
const CREDENTIAL_PATHS = [
  /(^|\/)\.env(\.[a-z.]+)?$/,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
  /\.(pem|p12|pfx|key)$/,
  /(^|\/)\.aws\/credentials$/,
  /(^|\/)\.ssh\//,
  /(^|\/)\.npmrc$/,
  /(^|\/)credentials\.json$/,
]

/** The example file is the one meant to be read, so it is never a credential file. */
const ALWAYS_READABLE = [/\.example$/, /\.sample$/, /\.template$/]

/** Commands that move a file's contents somewhere a credential should not go. */
const READING_COMMANDS =
  /\b(cat|bat|less|more|head|tail|strings|xxd|od|base64|open|pbcopy|source)\b/

/** Shapes that are a live credential rather than a placeholder. */
const CREDENTIAL_CONTENT = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bghp_[A-Za-z0-9]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
]

function isCredentialPath(path: string): boolean {
  if (path === '') return false
  if (ALWAYS_READABLE.some((pattern) => pattern.test(path))) return false
  return CREDENTIAL_PATHS.some((pattern) => pattern.test(path))
}

const payload = parsePayload(await readStdin())
const tool = payload.tool_name ?? ''
const input = payload.tool_input ?? {}

function stringField(name: string): string {
  const value = input[name]
  return typeof value === 'string' ? value : ''
}

const targetPath = payload.file_path !== undefined ? payload.file_path : stringField('file_path')

if (tool === 'Read' && isCredentialPath(targetPath)) {
  block(
    `Blocked: ${targetPath} holds credentials. Read the example file instead, and reach real values through the environment schema.`
  )
}

if (tool === 'Bash') {
  /**
   * Only the arguments of a reading command count, and only on the same line as that command.
   * Scanning the whole command string instead would block any script that so much as mentions a
   * credential path, including the one that writes the ignore file listing them, and a guard that
   * blocks ordinary work is a guard somebody turns off.
   */
  for (const line of bashCommand(payload).split('\n')) {
    const match = READING_COMMANDS.exec(line)
    if (match === null) continue
    const args = line.slice(match.index + match[0].length).split(/[\s'"|;&><]+/)
    const credential = args.filter(Boolean).find((word) => isCredentialPath(word))
    if (credential !== undefined) {
      block(
        `Blocked: that command reads ${credential}, which holds credentials. Read the example file instead.`
      )
    }
  }
}

/** A test proving this guard works has to contain the shapes it blocks. */
const isTestFile = /\.test\.tsx?$/.test(targetPath)

if (!isTestFile && !isCredentialPath(targetPath)) {
  const written = `${stringField('content')}\n${stringField('new_string')}`
  const matched = CREDENTIAL_CONTENT.find((pattern) => pattern.test(written))
  if (matched !== undefined) {
    block(
      'Blocked: that content looks like a live credential. Put the value in your untracked local environment file and reach it through the environment schema.'
    )
  }
}

allow()
