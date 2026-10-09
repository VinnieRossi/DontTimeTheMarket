import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddDataSheet } from './AddDataSheet'

const TIERS = [
  {
    name: 'Tier 1 - Chart stuff',
    items: [
      { key: 'sma', label: 'Moving averages (20/50)', checked: true },
      { key: 'volume', label: 'Volume', checked: false },
    ],
  },
]

describe('AddDataSheet', () => {
  it('groups the readouts by tier and shows which are already on', () => {
    render(
      <AddDataSheet
        tiers={TIERS}
        complexity="Busy"
        onToggle={() => undefined}
        onClose={() => undefined}
      />
    )
    expect(screen.getByText('Tier 1 - Chart stuff')).toBeVisible()
    expect(screen.getByRole('checkbox', { name: 'Moving averages (20/50)' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Volume' })).not.toBeChecked()
  })

  it('wears the label for how cluttered the screen has become', () => {
    render(
      <AddDataSheet
        tiers={TIERS}
        complexity="Full Terminal Mode"
        onToggle={() => undefined}
        onClose={() => undefined}
      />
    )
    expect(screen.getByText('Full Terminal Mode')).toBeVisible()
  })

  it('reports which readout was switched, and to what', async () => {
    const onToggle = vi.fn()
    render(
      <AddDataSheet tiers={TIERS} complexity="Busy" onToggle={onToggle} onClose={() => undefined} />
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Volume' }))
    expect(onToggle).toHaveBeenCalledWith('volume', true)
  })

  it('closes on request', async () => {
    const onClose = vi.fn()
    render(
      <AddDataSheet tiers={TIERS} complexity="Busy" onToggle={() => undefined} onClose={onClose} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
