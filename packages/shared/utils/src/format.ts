/**
 * Presentation formatting shared by components and stories. It lives here rather than in the
 * component layer so a story, a test, and a page all render the same string, and so the
 * component layer keeps no logic of its own.
 */

/** A locale-independent calendar date, safe to render on both the server and the client. */
export function formatIsoDate(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Shorten to `max` characters, ending in an ellipsis, without splitting mid-whitespace. */
export function truncate(value: string, max: number): string {
  if (max <= 0) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max).trimEnd()}...`
}
