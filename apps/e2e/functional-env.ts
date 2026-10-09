import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The functional suite's own target: a dedicated port, so a run never collides with a developer's
 * own `pnpm dev`. There is nothing else to set up. The game is a deterministic simulation running
 * in the browser against data committed to this repository, so the suite has no database to
 * reset, no service to start, and no environment to configure.
 *
 * `next dev` rather than a production build, because the build output would have to be made first
 * and the suite is checking behavior rather than the bundle.
 */
export const APP_BASE_URL = 'http://localhost:3101'

const E2E_DIR = dirname(fileURLToPath(import.meta.url))
export const ROOT_DIR = resolve(E2E_DIR, '..', '..')
