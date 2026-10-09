import { defineConfig } from 'drizzle-kit'

/**
 * Migrations are generated from the schema and committed as SQL, so a schema change is
 * reviewable in the diff and replayable anywhere. `drizzle-kit push` is not used, because a
 * schema pushed directly leaves no record of what the database looked like before.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
})
