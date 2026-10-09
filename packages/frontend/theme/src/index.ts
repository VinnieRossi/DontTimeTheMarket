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

/**
 * The few token values a renderer that cannot read a stylesheet needs: the generated app icon
 * draws into an image, and a canvas takes a color string. Nothing else should reach for these.
 * This file's test asserts each one still equals the token it mirrors, so the pair cannot drift.
 */
export const RAW_TOKENS = {
  accent: '#0e7fae',
  inkInverse: '#ffffff',
} as const

export const MIRRORED_TOKENS: Record<keyof typeof RAW_TOKENS, string> = {
  accent: '--app-accent',
  inkInverse: '--app-ink-inverse',
}
