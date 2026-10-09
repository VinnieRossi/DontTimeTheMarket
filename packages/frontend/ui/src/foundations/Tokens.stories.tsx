import { SIZES, TONES } from '@dttm/theme'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button'
import { StatusBadge } from '../atoms/StatusBadge'

/**
 * The design system on one page. It is the fastest way to see whether a token change did what was
 * intended, and it doubles as the reference somebody reads before adding a component.
 */
const meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta

const SURFACE_TOKENS = [
  '--app-bg',
  '--app-surface',
  '--app-surface-raised',
  '--app-border',
  '--app-ink',
  '--app-ink-muted',
] as const

const SPACING_TOKENS = [
  '--app-space-1',
  '--app-space-2',
  '--app-space-3',
  '--app-space-4',
  '--app-space-5',
  '--app-space-6',
] as const

export const Palette: StoryObj = {
  render: () => (
    <div className="app-stack">
      <div className="app-row">
        {SURFACE_TOKENS.map((token) => (
          <div key={token} className="app-stack">
            <div
              style={{
                width: 72,
                height: 48,
                background: `var(${token})`,
                border: '1px solid var(--app-border)',
                borderRadius: 'var(--app-radius-sm)',
              }}
            />
            <span className="app-note-card__meta">{token}</span>
          </div>
        ))}
      </div>
      <div className="app-row">
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone}>
            {tone}
          </StatusBadge>
        ))}
      </div>
    </div>
  ),
}

export const Spacing: StoryObj = {
  render: () => (
    <div className="app-stack">
      {SPACING_TOKENS.map((token) => (
        <div key={token} className="app-row">
          <div style={{ width: `var(${token})`, height: 16, background: 'var(--app-ink)' }} />
          <span className="app-note-card__meta">{token}</span>
        </div>
      ))}
    </div>
  ),
}

export const Controls: StoryObj = {
  render: () => (
    <div className="app-row">
      {SIZES.map((size) => (
        <Button key={size} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
}
