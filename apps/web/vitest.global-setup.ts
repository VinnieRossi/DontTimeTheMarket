import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * A database per run, in a throwaway directory. Without this the suite would inherit whatever the
 * last run left behind, and a test that counts rows or drains a queue would pass or fail depending
 * on what happened the time before. That is the slowest kind of flake to diagnose, because the run
 * that fails is not the run that caused it.
 */
let directory: string | undefined

export function setup(): void {
  directory = mkdtempSync(join(tmpdir(), 'app-web-test-db-'))
  process.env['DATABASE_DIR'] = directory
}

export function teardown(): void {
  if (directory !== undefined) rmSync(directory, { recursive: true, force: true })
}
