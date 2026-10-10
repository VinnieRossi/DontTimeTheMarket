import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SAMPLE_HOLDINGS } from '../story-support'
import { HoldingsList } from './HoldingsList'

const EMPTY = 'Every position is sold. You are entirely in cash.'

describe('HoldingsList', () => {
  it('shows what each holding is worth and how far it has drifted from its target', () => {
    render(<HoldingsList holdings={SAMPLE_HOLDINGS} emptyNote={EMPTY} onTradeHolding={vi.fn()} />)
    expect(screen.getByText('$4,180')).toBeVisible()
    expect(screen.getByText('41% now, 33% target')).toBeVisible()
    expect(screen.getByText('+8.0 pts')).toBeVisible()
  })

  it('colors a holding that is over its target apart from one that is under', () => {
    const { container } = render(
      <HoldingsList holdings={SAMPLE_HOLDINGS} emptyNote={EMPTY} onTradeHolding={vi.fn()} />
    )
    expect(container.querySelectorAll('.app-text-up')).toHaveLength(1)
    expect(container.querySelectorAll('.app-text-down')).toHaveLength(2)
  })

  it('draws each holding’s own price line, named so it can be read without seeing it', () => {
    render(<HoldingsList holdings={SAMPLE_HOLDINGS} emptyNote={EMPTY} onTradeHolding={vi.fn()} />)
    expect(screen.getByRole('img', { name: 'NTHX price line' })).toBeVisible()
  })

  it('reports which holding was tapped rather than opening anything itself', async () => {
    const onTradeHolding = vi.fn()
    render(
      <HoldingsList holdings={SAMPLE_HOLDINGS} emptyNote={EMPTY} onTradeHolding={onTradeHolding} />
    )
    await userEvent.click(screen.getByRole('button', { name: /CRWD/ }))
    expect(onTradeHolding).toHaveBeenCalledWith('c2')
  })

  it('says the portfolio is all cash rather than showing an empty list', () => {
    render(<HoldingsList holdings={[]} emptyNote={EMPTY} onTradeHolding={vi.fn()} />)
    expect(screen.getByText(EMPTY)).toBeVisible()
  })
})
