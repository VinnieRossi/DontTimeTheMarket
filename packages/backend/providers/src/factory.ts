import type { Clock, IdGenerator, MailProvider, QueueProvider } from '@dttm/contracts'
import type { Database } from '@dttm/database'
import type { Env } from '@dttm/env'
import type { Logger } from '@dttm/logger'
import { AppError } from '@dttm/types'
import { RecordingMailProvider } from './mail/recording-mail-provider'
import { DrizzleQueueProvider } from './queue/drizzle-queue-provider'
import { SystemClock } from './system/clock'
import { RandomIdGenerator } from './system/id-generator'

/** Every capability the rest of the application depends on, by interface rather than by class. */
export interface Providers {
  clock: Clock
  ids: IdGenerator
  queue: QueueProvider
  mail: MailProvider
}

/** Raised at boot when a capability has nothing to satisfy it. */
export class ProviderConfigError extends AppError {
  readonly code = 'PROVIDER_CONFIG_ERROR'
  readonly status = 500
}

type ProviderMode = Env['PROVIDER_MODE']

/** What a provider actually runs as, and whether that came from its own override or was inherited. */
interface ResolvedProviderMode {
  mode: ProviderMode
  explicit: boolean
}

function resolveMode(
  global: ProviderMode,
  override: ProviderMode | undefined
): ResolvedProviderMode {
  return override === undefined
    ? { mode: global, explicit: false }
    : { mode: override, explicit: true }
}

/** Every provider `PROVIDER_MODE` governs, each resolved against its own override. */
interface ProviderModes {
  mail: ResolvedProviderMode
}

/**
 * Resolve every provider's mode at once. A new provider adds one optional `<NAME>_PROVIDER_MODE`
 * key to the env schema, one field to `ProviderModes`, and one line here.
 */
function resolveProviderModes(env: Env): ProviderModes {
  return {
    mail: resolveMode(env.PROVIDER_MODE, env.MAIL_PROVIDER_MODE),
  }
}

/**
 * The providers currently running mocked, whether by inheriting the global default or by their own
 * override. Boot warns about these in production, and the health endpoint reports them, which is
 * what lets an incremental build ship one capability live while another is still mocked without a
 * fake ever standing in silently.
 */
export function resolveMockedProviders(env: Env): string[] {
  return Object.entries(resolveProviderModes(env))
    .filter(([, resolved]) => resolved.mode === 'mock')
    .map(([name]) => name)
}

/**
 * A provider resolved to `mock` only because it inherited the global default must never reach
 * production silently: an operator reading `PROVIDER_MODE=live` in the deploy config would have no
 * reason to suspect this one capability was still fake. A provider mocked on purpose in production
 * sets its own override instead, which this allows through.
 */
function assertNotInheritedMockInProduction(
  env: Env,
  name: string,
  resolved: ResolvedProviderMode
): void {
  if (env.NODE_ENV !== 'production' || resolved.mode !== 'mock' || resolved.explicit) return
  const overrideKey = `${name.toUpperCase()}_PROVIDER_MODE`
  throw new ProviderConfigError(
    `${name} would run mocked in production only by inheriting the global PROVIDER_MODE=mock: production runs a provider mocked only when its own override says so explicitly. Set ${overrideKey}=live and wire a real adapter, or set ${overrideKey}=mock to mock it on purpose.`
  )
}

/**
 * Live mode means a capability is backed by a real adapter, so one with none refuses to build
 * rather than falling back to a fake or a log line. The only mail adapters this template ships
 * record or log what they were given, which is exactly the silent loss live mode is there to rule
 * out. A project adds its vendor's adapter here and this branch stops throwing.
 */
function selectMail(env: Env): MailProvider {
  const resolved = resolveProviderModes(env).mail
  assertNotInheritedMockInProduction(env, 'mail', resolved)
  if (resolved.mode === 'mock') return new RecordingMailProvider()
  throw new ProviderConfigError(
    'mail resolved to live, via PROVIDER_MODE or MAIL_PROVIDER_MODE, but has no real mail adapter: the template ships only a recording one and a log-only one, which drop mail. Wire a real MailProvider in the factory first.'
  )
}

export interface CreateProvidersInput {
  env: Env
  logger: Logger
  db: Database
}

/**
 * Build the provider set from configuration.
 *
 * `PROVIDER_MODE` decides what happens at the boundaries that reach outside this system: in `mock`
 * nothing is contacted and what would have been sent is recorded, and in `live` every boundary must
 * have a real adapter or boot fails naming the one that does not. It is what lets a fresh clone
 * work with no accounts.
 *
 * Each provider has its own optional override (`MAIL_PROVIDER_MODE` today) that takes precedence
 * over the global default, so a project can build incrementally: one capability live while another
 * is still mocked. Boot warns once, naming every provider running mocked in production, because that
 * is only ever supposed to happen on purpose.
 *
 * The queue is deliberately not part of that choice. It is always the durable one, because work
 * held in a process is work that disappears: a web app's routes are separately bundled, so two
 * routes do not share an in-memory queue at all, and a restart loses whatever was in it either way.
 * That is exactly the silent loss the pipeline exists to prevent, so the in-memory queue stays what
 * it is, a test double, and never becomes a runtime choice somebody can select by accident.
 *
 * Selecting an implementation is a configuration change. Nothing downstream knows which one it got.
 */
export function createProviders(input: CreateProvidersInput): Providers {
  const { env, db, logger } = input
  const clock = new SystemClock()
  const ids = new RandomIdGenerator()
  const mail = selectMail(env)

  const mockedProviders = resolveMockedProviders(env)
  if (env.NODE_ENV === 'production' && mockedProviders.length > 0) {
    logger.warn('booting with a provider running mocked in production', { mockedProviders })
  }

  return {
    clock,
    ids,
    queue: new DrizzleQueueProvider({ db, ids, clock }),
    mail,
  }
}
