/**
 * The semantic vocabulary components use. A component takes a tone, not a color: the mapping from
 * a tone to a value lives in the token file, so changing what "danger" looks like is one edit and
 * no component has an opinion about it.
 */
export const TONES = ['neutral', 'info', 'success', 'warning', 'danger'] as const
export type Tone = (typeof TONES)[number]

export const SIZES = ['sm', 'md', 'lg'] as const
export type Size = (typeof SIZES)[number]

export function isTone(value: unknown): value is Tone {
  return typeof value === 'string' && (TONES as readonly string[]).includes(value)
}
