import { oc } from '@orpc/contract'
import { z } from 'zod'

/** A liveness probe. It also gives a new project one trivial route to wire end to end. */
export const HealthOutputSchema = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number().nonnegative(),
  /** Providers currently running mocked, by name, so an incremental live rollout stays visible. */
  mockedProviders: z.array(z.string()),
})
export type HealthOutput = z.infer<typeof HealthOutputSchema>

export const health = oc
  .route({ method: 'GET', path: '/health', summary: 'Liveness probe' })
  .output(HealthOutputSchema)
