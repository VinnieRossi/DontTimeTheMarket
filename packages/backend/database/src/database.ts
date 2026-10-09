import type { PgliteDatabase } from 'drizzle-orm/pglite'
import type * as schema from './schema'

/**
 * The database handle every consumer receives: the Drizzle client bound to this package's
 * schema. It is a type-only export, so a package that just needs to accept a database in its
 * signature does not pull in the runtime that creates one.
 */
export type Database = PgliteDatabase<typeof schema>
