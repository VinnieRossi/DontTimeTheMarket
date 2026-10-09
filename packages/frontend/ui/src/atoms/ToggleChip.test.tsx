import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToggleChip } from './ToggleChip'

describe('ToggleChip', () => {
  it('announces whether it is the chosen option rather than only coloring itself', () => {
    render(
      <ToggleChip selected onSelect={() => undefined}>
        4x
      </ToggleChip>
    )
    expect(screen.getByRole('button', { name: '4x' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports being chosen without deciding anything itself', async () => {
    const onSelect = vi.fn()
    render(
      <ToggleChip selected={false} onSelect={onSelect}>
        4x
      </ToggleChip>
    )

    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('carries its size in its class names', () => {
    render(
      <ToggleChip size="md" selected={false} onSelect={() => undefined}>
        Standard - 3 years
      </ToggleChip>
    )
    expect(screen.getByRole('button').className).toContain('app-chip--md')
  })
})
