import { describe, expect, it } from 'vitest'
import { assertNever } from './exhaustive'

describe('assertNever', () => {
  it('throws, naming the value it was not expecting', () => {
    expect(() => assertNever('surprise' as never, 'note status')).toThrow(
      'Unhandled note status: surprise'
    )
  })

  it('falls back to a generic description', () => {
    expect(() => assertNever(7 as never)).toThrow('Unhandled value: 7')
  })
})
