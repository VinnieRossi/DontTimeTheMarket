import { UnauthorizedError } from '@dttm/types'
import type { Role } from './roles'

/**
 * The session is deliberately small, because it travels with every request. Anything that can be
 * fetched on demand, a display name, a preference, a feature flag, is fetched on demand rather
 * than carried here.
 */
export interface Session {
  userId: string
  role: Role
}

/**
 * Where a session comes from is a port, so the application does not learn which identity
 * provider is behind it. A project swaps the implementation and changes nothing that reads a
 * session.
 */
export interface SessionReader {
  /** The caller's session, or null when there is none. */
  current(): Promise<Session | null>
}

/**
 * A session that is whatever it was constructed with. This is what runs in mock mode and in
 * tests: it needs no identity provider, and a test can say plainly which role it is exercising
 * rather than building a token to imply one.
 */
export class StaticSessionReader implements SessionReader {
  private session: Session | null

  constructor(session: Session | null) {
    this.session = session
  }

  current(): Promise<Session | null> {
    return Promise.resolve(this.session)
  }

  /** Switch who is calling, to drive the same code path as two different roles. */
  setSession(session: Session | null): void {
    this.session = session
  }
}

/**
 * The session, or a refusal. Handlers use this where a route requires a caller, so the failure
 * is one typed error rather than a null check repeated at every entry point.
 */
export async function requireSession(reader: SessionReader): Promise<Session> {
  const session = await reader.current()
  if (session === null) throw new UnauthorizedError('This action requires a signed-in caller')
  return session
}
