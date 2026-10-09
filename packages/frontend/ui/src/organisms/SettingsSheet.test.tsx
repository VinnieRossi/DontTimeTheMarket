import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsSheet } from './SettingsSheet'

const SWITCHES = [
  { key: 'fees', label: 'Trading fees & spread (3 bps)', checked: true },
  { key: 'reinvestDividends', label: 'Auto-reinvest my dividends', checked: false },
]

describe('SettingsSheet', () => {
  it('shows each switch and the state it is in', () => {
    render(
      <SettingsSheet switches={SWITCHES} onToggle={() => undefined} onClose={() => undefined} />
    )
    expect(screen.getByRole('switch', { name: 'Trading fees & spread (3 bps)' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Auto-reinvest my dividends' })).not.toBeChecked()
  })

  it('reports which switch was flipped, and to what', async () => {
    const onToggle = vi.fn()
    render(<SettingsSheet switches={SWITCHES} onToggle={onToggle} onClose={() => undefined} />)

    await userEvent.click(screen.getByRole('switch', { name: 'Auto-reinvest my dividends' }))
    expect(onToggle).toHaveBeenCalledWith('reinvestDividends', true)
  })

  it('closes on request', async () => {
    const onClose = vi.fn()
    render(<SettingsSheet switches={SWITCHES} onToggle={() => undefined} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
