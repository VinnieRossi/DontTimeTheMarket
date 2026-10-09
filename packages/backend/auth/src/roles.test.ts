import { describe, expect, it } from 'vitest'
import { isRole, levelOf, ROLE_LEVELS, ROLES } from './roles'

describe('roles', () => {
  it('orders the roles strictly, so no two are ambiguous', () => {
    const levels = ROLES.map(levelOf)
    expect([...levels].sort((a, b) => a - b)).toEqual(levels)
    expect(new Set(levels).size).toBe(levels.length)
  })

  it('leaves gaps between levels, so a new role can be inserted without renumbering', () => {
    const sorted = [...ROLES].sort((a, b) => levelOf(a) - levelOf(b))
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1]
      const current = sorted[index]
      if (previous === undefined || current === undefined) continue
      expect(levelOf(current) - levelOf(previous)).toBeGreaterThan(1)
    }
  })

  it('recognizes a role and rejects anything else', () => {
    expect(isRole('admin')).toBe(true)
    expect(isRole('superuser')).toBe(false)
    expect(isRole(30)).toBe(false)
  })

  it('exposes the level of each role', () => {
    expect(levelOf('guest')).toBe(ROLE_LEVELS.guest)
    expect(levelOf('owner')).toBe(ROLE_LEVELS.owner)
  })
})
