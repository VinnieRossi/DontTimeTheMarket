/**
 * Roles carry numeric levels, so a check reads as a comparison rather than a list of strings.
 * A new role slots in between two existing ones without touching any check, and the ordering
 * between any two roles is never ambiguous, which is what string comparison cannot promise.
 */
export const ROLE_LEVELS = {
  guest: 0,
  member: 10,
  editor: 20,
  admin: 30,
  owner: 40,
} as const

export type Role = keyof typeof ROLE_LEVELS

export const ROLES = Object.keys(ROLE_LEVELS) as Role[]

export function levelOf(role: Role): number {
  return ROLE_LEVELS[role]
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLE_LEVELS
}
