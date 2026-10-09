import type { SessionReader } from '@dttm/auth'
import type { Database } from '@dttm/database'
import { createPersistentDatabase } from '@dttm/database/runtime'
import { type Env, parseEnv } from '@dttm/env'
import { getLogger, type Logger } from '@dttm/logger'
import { createProviders, type Providers } from '@dttm/providers'
import { resolveSessionReader } from './session'

/**
 * The composition root. This is the one place that decides what satisfies each interface, and the
 * only place that reads configuration. Everything below it receives what it needs, which is why
 * every layer under here is testable without starting the app.
 *
 * It is built once per process and on first use rather than at import time, so a build that only
 * needs to compile a route never opens a database.
 */
export interface ServerContainer {
  env: Env
  logger: Logger
  db: Database
  providers: Providers
  session: SessionReader
}

let container: Promise<ServerContainer> | undefined

async function build(): Promise<ServerContainer> {
  const env = parseEnv()
  const logger = getLogger('web', { level: env.LOG_LEVEL })
  const db = await createPersistentDatabase(env.DATABASE_DIR)
  const providers = createProviders({ env, logger, db })

  const session = resolveSessionReader(env)

  logger.info('server container ready', { providerMode: env.PROVIDER_MODE })
  return { env, logger, db, providers, session }
}

export function getContainer(): Promise<ServerContainer> {
  container ??= build()
  return container
}
