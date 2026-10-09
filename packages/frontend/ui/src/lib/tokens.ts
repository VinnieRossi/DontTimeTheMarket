/**
 * Reads a design token at runtime. Almost nothing needs this: a component sets a class and the
 * stylesheet resolves the token itself. The chart is the exception, because the charting library
 * paints onto a canvas and takes a color string rather than reading a class.
 *
 * An unresolved token comes back as undefined so a caller can leave the option out entirely and
 * fall back to the library's own default, which is what happens in a renderer that loads no
 * stylesheets at all.
 */
export function readToken(name: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value === '' ? undefined : value
}

/** A token holding a pixel length, as the number a canvas needs. */
export function readTokenPx(name: string): number | undefined {
  const value = readToken(name)
  if (value === undefined) return undefined
  const pixels = Number.parseFloat(value)
  return Number.isFinite(pixels) ? pixels : undefined
}

/** An option entry for a token that resolved, and nothing at all for one that did not. */
export function tokenOption<K extends string>(key: K, name: string): Partial<Record<K, string>> {
  const value = readToken(name)
  return value === undefined ? {} : ({ [key]: value } as Record<K, string>)
}
