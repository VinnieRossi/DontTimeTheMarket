import type { InferContractRouterInputs, InferContractRouterOutputs } from '@orpc/contract'
import { health } from './health'
import { notesContract } from './notes'

/**
 * The root contract: the one typed seam the server implements and the client calls. Both sides
 * take their types from this object, so a route's input and output have exactly one definition
 * and a change to either lights up every call site that needs updating.
 */
export const apiContract = {
  health,
  notes: notesContract,
}

export type ApiContract = typeof apiContract

/** Per-route input types, keyed by router path, inferred from the contract itself. */
export type ApiInputs = InferContractRouterInputs<ApiContract>

/** Per-route output types, keyed by router path, inferred from the contract itself. */
export type ApiOutputs = InferContractRouterOutputs<ApiContract>
