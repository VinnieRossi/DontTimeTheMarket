import { ValidationError } from '@dttm/types'
import { z } from 'zod'

/**
 * The one description of this project's configuration. Nothing else reads `process.env`, so a
 * variable that is missing or malformed fails once, at boot, with every problem listed, rather
 * than surfacing later as an undefined deep inside a request.
 *
 * Credentials are optional because `PROVIDER_MODE=mock` runs the whole application with
 * in-process fakes and no accounts. Each capability asserts the keys it needs when it is
 * constructed in `live` mode, so a production boot missing one fails loudly instead of quietly
 * degrading to a fake that drops work.
 *
 * `PROVIDER_MODE` is the global default, and each external provider has its own optional
 * `<NAME>_PROVIDER_MODE` override so a project can build incrementally, running one capability
 * live while another is still mocked. Unset, a provider inherits the global default. See
 * `docs/adr/0005-per-provider-mode-override.md` for the production guard this enables.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PROVIDER_MODE: z.enum(['mock', 'live']).default('mock'),
    /** Overrides `PROVIDER_MODE` for mail only. Unset, mail inherits the global default. */
    MAIL_PROVIDER_MODE: z.enum(['mock', 'live']).optional(),
    APP_URL: z.string().url().default('http://localhost:3000'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    /**
     * Where the database keeps its files. The shipped runtime is an in-process Postgres, so a
     * directory is all it needs and a fresh clone has a working database without installing one.
     * A project moving to a hosted Postgres replaces the one function that opens the connection and
     * swaps this for that server's URL.
     */
    DATABASE_DIR: z.string().min(1).default('.data/app-db'),
    MAIL_FROM: z.string().email().default('noreply@example.com'),
    PIPELINE_SECRET: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      env.PIPELINE_SECRET !== undefined ||
      (env.NODE_ENV !== 'production' &&
        env.PROVIDER_MODE !== 'live' &&
        env.MAIL_PROVIDER_MODE !== 'live'),
    {
      message:
        'is required when NODE_ENV is production or PROVIDER_MODE or a per-provider override is live',
      path: ['PIPELINE_SECRET'],
    }
  )

export type Env = z.infer<typeof envSchema>

/** Empty strings come from unfilled `.env` keys, and mean unset rather than "the empty value". */
function dropEmpty(source: Record<string, string | undefined>): Record<string, string | undefined> {
  const cleaned: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(source)) {
    cleaned[key] = value === '' ? undefined : value
  }
  return cleaned
}

/**
 * Parse configuration, listing every problem at once. The source is injectable so a test can
 * exercise a configuration without touching the process it runs in.
 *
 * It reads `process.env` directly rather than guarding for a runtime without one: configuration is
 * read on the server, and a defensive fallback here would be a branch nothing can reach and nobody
 * can test.
 */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(dropEmpty(source))
  if (!result.success) {
    // Every issue names a key, because the source is always an object by the time it is parsed.
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new ValidationError(`Invalid environment configuration:\n${issues}`)
  }
  return result.data
}
