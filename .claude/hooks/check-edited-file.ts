#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { allow, block, parsePayload, projectDir, readStdin } from './lib.ts'

/**
 * Lints and formats a file the moment it is written, so a problem is fixed while the agent is
 * still in the context that produced it rather than accumulating until the gate runs.
 *
 * This is deliberately per-file and therefore blind to one class of error: a type that changed
 * in one package and broke a consumer in another, where nothing inside either file is wrong.
 * The whole-workspace typecheck in the gate is what catches that.
 *
 * Wired at PostToolUse on Write, Edit, and MultiEdit.
 */
const CHECKED = new Set(['.ts', '.tsx', '.css', '.json', '.md'])

const payload = parsePayload(await readStdin())
const file = payload.file_path ?? ''

if (file === '' || !CHECKED.has(extname(file)) || !existsSync(file)) allow()

const root = projectDir()
const biome = join(root, 'node_modules', '.bin', 'biome')
if (!existsSync(biome)) allow()

const result = spawnSync(biome, ['check', '--write', file], { encoding: 'utf8', cwd: root })
if ((result.status ?? 1) !== 0) {
  block(
    `Lint failed on ${file}. Fix these before continuing, because the gate will refuse the same problems:\n${result.stdout}${result.stderr}`
  )
}

allow()
