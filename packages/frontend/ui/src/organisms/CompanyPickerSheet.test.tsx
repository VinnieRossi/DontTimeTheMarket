import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SAMPLE_COMPANIES, SAMPLE_SECTOR_GROUPS } from '../story-support'
import { CompanyPickerSheet } from './CompanyPickerSheet'

function renderSheet(handlers: { onPick?: () => void; onOpenCompany?: () => void } = {}) {
  const props = { onPick: vi.fn(), onOpenCompany: vi.fn(), ...handlers }
  render(
    <CompanyPickerSheet
      companies={SAMPLE_COMPANIES}
      groups={SAMPLE_SECTOR_GROUPS}
      currentGroup="all"
      emptyNote="No companies in that sector."
      lede="Any company on the roster, held or not."
      onSelectGroup={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  )
  return props
}

describe('CompanyPickerSheet', () => {
  it('offers the whole roster, so a position can be opened in anything', () => {
    renderSheet()
    for (const company of SAMPLE_COMPANIES) {
      expect(screen.getByText(company.ticker)).toBeVisible()
    }
  })

  it('reports the company that was picked rather than buying it itself', async () => {
    const { onPick } = renderSheet()
    await userEvent.click(screen.getByRole('button', { name: /LNDN/, pressed: false }))
    expect(onPick).toHaveBeenCalledWith('c4')
  })

  it('reports a request to read a company before any decision is taken about it', async () => {
    const { onPick, onOpenCompany } = renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'Details for OKHP' }))
    expect(onOpenCompany).toHaveBeenCalledWith('c3')
    expect(onPick).not.toHaveBeenCalled()
  })

  it('closes on the keyboard, so nobody is trapped in it', async () => {
    const onClose = vi.fn()
    render(
      <CompanyPickerSheet
        companies={SAMPLE_COMPANIES}
        groups={SAMPLE_SECTOR_GROUPS}
        currentGroup="all"
        emptyNote="No companies in that sector."
        lede="Any company on the roster."
        onSelectGroup={vi.fn()}
        onPick={vi.fn()}
        onOpenCompany={vi.fn()}
        onClose={onClose}
      />
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
