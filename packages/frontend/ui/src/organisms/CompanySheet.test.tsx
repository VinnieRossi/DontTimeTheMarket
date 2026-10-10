import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SAMPLE_COMPANY_DETAIL } from '../story-support'
import { CompanySheet } from './CompanySheet'

const ENABLED = { label: 'Add to portfolio', enabled: true }

describe('CompanySheet', () => {
  it('heads the panel with the disguise and the truthful grouping under it', () => {
    render(
      <CompanySheet
        company={SAMPLE_COMPANY_DETAIL}
        action={ENABLED}
        onAct={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('heading', { name: 'NTHX - Northfield Analytics' })).toBeVisible()
    expect(screen.getByText(/Information Technology.*Semiconductors/)).toBeVisible()
  })

  it('shows the trends as shapes with a sentence each and no figures', () => {
    render(
      <CompanySheet
        company={SAMPLE_COMPANY_DETAIL}
        action={ENABLED}
        onAct={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('img', { name: 'Revenue trend' })).toBeVisible()
    expect(screen.getByText('Growing, steadily')).toBeVisible()
  })

  it('leaves the trends out entirely for a company with no filings to read', () => {
    render(
      <CompanySheet
        company={{ ...SAMPLE_COMPANY_DETAIL, trends: [] }}
        action={ENABLED}
        onAct={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByText('Fundamentals, as trends')).toBeNull()
  })

  it('shows the flavor note, so the panel does not read as missing something', () => {
    render(
      <CompanySheet
        company={SAMPLE_COMPANY_DETAIL}
        action={ENABLED}
        onAct={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(SAMPLE_COMPANY_DETAIL.note)).toBeVisible()
  })

  it('reports the committing action, and refuses it when its owner turned it off', async () => {
    const onAct = vi.fn()
    const { unmount } = render(
      <CompanySheet
        company={SAMPLE_COMPANY_DETAIL}
        action={ENABLED}
        onAct={onAct}
        onClose={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add to portfolio' }))
    expect(onAct).toHaveBeenCalledTimes(1)
    unmount()

    render(
      <CompanySheet
        company={SAMPLE_COMPANY_DETAIL}
        action={{ label: 'Already in your portfolio', enabled: false }}
        onAct={onAct}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Already in your portfolio' })).toBeDisabled()
  })
})
