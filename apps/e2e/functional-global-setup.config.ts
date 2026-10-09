import { mkdirSync, rmSync } from 'node:fs'
import { FUNCTIONAL_DATABASE_DIR } from './functional-env'

/**
 * A database per run, in a throwaway directory, the same reason `apps/web/vitest.global-setup.ts`
 * gives one to every vitest run: without this the suite would inherit whatever the previous run
 * left behind, and a test that asserts a note was created would pass or fail depending on what
 * ran before it. `webServer` starts a fresh `next dev` process after this runs, so the directory
 * is empty by the time the app opens it.
 */
export default function globalSetup(): void {
  rmSync(FUNCTIONAL_DATABASE_DIR, { recursive: true, force: true })
  mkdirSync(FUNCTIONAL_DATABASE_DIR, { recursive: true })
}
