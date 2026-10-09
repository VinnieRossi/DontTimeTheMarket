import { type SessionReader, StaticSessionReader } from '@dttm/auth'
import type { Env } from '@dttm/env'
import { ProviderConfigError } from '@dttm/providers'

/**
 * Where the caller's identity comes from. The template ships a fixed session so the app runs with
 * no identity provider and the permission checks are exercised rather than skipped, and that is
 * only ever acceptable when nothing real is at stake. In live mode or production it would make
 * every caller the same editor, so boot refuses until a project wires a real reader here.
 */
export function resolveSessionReader(env: Env): SessionReader {
  if (env.PROVIDER_MODE === 'live' || env.NODE_ENV === 'production') {
    throw new ProviderConfigError(
      'No session reader is wired for live or production use: the template ships only a static one that makes every caller an editor. Wire a real SessionReader in resolveSessionReader first.'
    )
  }
  return new StaticSessionReader({ userId: 'u_local', role: 'editor' })
}
