import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isTone, MIRRORED_TOKENS, RAW_TOKENS, SIZES, TONES } from './index'

/**
 * The token file is a machine-consumed stylesheet, so it is parsed into the custom properties each
 * selector really declares rather than searched as text. A declaration inside a comment, or in a
 * block other than `:root`, does not count, because a browser would not resolve it either.
 */
function parseCustomProperties(css: string): Map<string, Map<string, string>> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const blocks = new Map<string, Map<string, string>>()
  for (const [, selector, body] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = blocks.get(selector?.trim() ?? '') ?? new Map<string, string>()
    for (const [, name, value] of (body ?? '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      if (name !== undefined && value !== undefined) declarations.set(name, value.trim())
    }
    blocks.set(selector?.trim() ?? '', declarations)
  }
  return blocks
}

const tokens =
  parseCustomProperties(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'tokens.css'), 'utf8')
  ).get(':root') ?? new Map<string, string>()

describe('tones', () => {
  it('recognizes a tone and rejects anything else', () => {
    expect(isTone('danger')).toBe(true)
    expect(isTone('spicy')).toBe(false)
    expect(isTone(3)).toBe(false)
  })

  it('has a token for every tone it names, so no component resolves to nothing', () => {
    for (const tone of TONES) {
      expect(tokens.get(`--app-tone-${tone}`)).toMatch(/\S/)
      expect(tokens.get(`--app-tone-${tone}-soft`)).toMatch(/\S/)
    }
  })

  it('names three sizes, which is what the components implement', () => {
    expect(SIZES).toEqual(['sm', 'md', 'lg'])
  })
})

describe('the mirrored token values', () => {
  it('still equal the tokens they mirror, so an icon cannot drift from the palette', () => {
    for (const [name, token] of Object.entries(MIRRORED_TOKENS)) {
      expect(tokens.get(token), token).toBe(RAW_TOKENS[name as keyof typeof RAW_TOKENS])
    }
  })
})

describe('tokens', () => {
  it('defines the surface, spacing, radius, and type scales the components resolve against', () => {
    for (const token of [
      '--app-bg',
      '--app-surface',
      '--app-border',
      '--app-ink',
      '--app-ink-muted',
      '--app-focus',
      '--app-space-1',
      '--app-space-6',
      '--app-radius',
      '--app-radius-pill',
      '--app-font-body',
      '--app-text-md',
      '--app-shadow',
    ]) {
      expect(tokens.get(token)).toMatch(/\S/)
    }
  })
})
