import { SIZES, TONES } from '@dttm/theme'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button'
import { StatusBadge } from '../atoms/StatusBadge'
import { ToggleChip } from '../atoms/ToggleChip'

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
  '--app-surface-sunken',
  '--app-border',
  '--app-ink',
  '--app-ink-muted',
  '--app-accent',
  '--app-accent-deep',
  '--app-up',
  '--app-down',
] as const

const SERIES_TOKENS = [
  '--app-series-price',
  '--app-series-player',
  '--app-series-benchmark',
  '--app-series-sma20',
  '--app-series-sma50',
] as const

const SPACING_TOKENS = [
  '--app-space-1',
  '--app-space-2',
  '--app-space-3',
  '--app-space-4',
  '--app-space-5',
  '--app-space-6',
  '--app-space-7',
  '--app-space-8',
  '--app-space-9',
  '--app-space-10',
] as const

const TYPE_TOKENS = [
  '--app-text-2xs',
  '--app-text-xs',
  '--app-text-sm',
  '--app-text-md',
  '--app-text-lg',
  '--app-text-xl',
  '--app-text-2xl',
  '--app-text-3xl',
  '--app-text-4xl',
  '--app-text-5xl',
] as const

function Swatches({ tokens }: { tokens: readonly string[] }) {
  return (
    <div className="app-row">
      {tokens.map((token) => (
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
          <span className="app-text-fine">{token}</span>
        </div>
      ))}
    </div>
  )
}

export const Palette: StoryObj = {
  render: () => (
    <div className="app-stack">
      <Swatches tokens={SURFACE_TOKENS} />
      <Swatches tokens={SERIES_TOKENS} />
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
          <span className="app-text-fine">{token}</span>
        </div>
      ))}
    </div>
  ),
}

export const Type: StoryObj = {
  render: () => (
    <div className="app-stack">
      {TYPE_TOKENS.map((token) => (
        <div key={token} className="app-row">
          <span style={{ fontSize: `var(${token})` }}>Don't Time The Market</span>
          <span className="app-text-fine">{token}</span>
        </div>
      ))}
      <span className="app-heading app-heading--md">A display heading, in Quicksand</span>
    </div>
  ),
}

export const Controls: StoryObj = {
  render: () => (
    <div className="app-stack">
      <div className="app-row">
        {SIZES.map((size) => (
          <Button key={size} size={size}>
            {size}
          </Button>
        ))}
      </div>
      <div className="app-row">
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="buy">Buy</Button>
        <Button variant="sell">Sell</Button>
      </div>
      <div className="app-row">
        <ToggleChip selected onSelect={() => undefined}>
          Selected
        </ToggleChip>
        <ToggleChip selected={false} onSelect={() => undefined}>
          Unselected
        </ToggleChip>
      </div>
    </div>
  ),
}
