import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { Database } from './database'
import * as schema from './schema'

/**
 * Creating a database is server-only work: it reads the committed migrations off disk and runs
 * them. It lives behind its own entry point (`@dttm/database/runtime`) so the packages that only
 * need the schema and its types never typecheck against Node's globals.
 */

/** Where the committed SQL migrations live, resolved from this file rather than from cwd. */
export function migrationsFolder(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle')
}

/**
 * An in-process Postgres, migrated and empty. This is what the tests and `PROVIDER_MODE=mock`
 * run against: real Postgres semantics, including the unique constraints the domain relies on,
 * with no server to start and nothing to install. Each call is an isolated database, so two
 * tests cannot see each other's rows.
 */
export async function createInMemoryDatabase(): Promise<Database> {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: migrationsFolder() })
  return db
}

/**
 * A database that persists in a directory. It keeps the template runnable end to end with no
 * hosted database; a project that needs a Postgres server replaces this one function with its
 * driver and changes no caller, because callers depend on the `Database` type rather than on
 * how the connection was made.
 */
export async function createPersistentDatabase(dataDirectory: string): Promise<Database> {
  // The database creates its own directory but not the path leading to it, so a configured
  // location like `.data/app-db` would otherwise fail on a fresh clone.
  mkdirSync(dataDirectory, { recursive: true })
  const db = drizzle(new PGlite(dataDirectory), { schema })
  await migrate(db, { migrationsFolder: migrationsFolder() })
  return db
}

/**
 * Release a database handle. Only a process that opens more than one over the same directory needs
 * this, which in practice means a test proving the rows really persisted.
 */
export async function closeDatabase(db: Database): Promise<void> {
  await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close()
}
