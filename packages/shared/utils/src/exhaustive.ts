/**
 * Fails the build when a union gains a member nobody handled. Call it in the default branch
 * of a switch over a union: the argument only typechecks while every member is covered, so
 * adding a status or a job type surfaces as a compile error rather than a silent fallthrough.
 */
export function assertNever(value: never, describe = 'value'): never {
  throw new Error(`Unhandled ${describe}: ${String(value)}`)
}
