import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SAMPLE_COMPANIES, SAMPLE_SECTOR_GROUPS } from '../story-support'
import { CompanyList } from './CompanyList'

function renderList(overrides: Partial<Parameters<typeof CompanyList>[0]> = {}) {
  const props = {
    companies: SAMPLE_COMPANIES,
    groups: SAMPLE_SECTOR_GROUPS,
    currentGroup: 'all',
    emptyNote: 'No companies in that sector.',
    onSelectGroup: vi.fn(),
    onToggleCompany: vi.fn(),
    onOpenCompany: vi.fn(),
    ...overrides,
  }
  render(<CompanyList {...props} />)
  return props
}

describe('CompanyList', () => {
  it('shows a disguised name over a truthful sector and industry', () => {
    renderList()
    expect(screen.getByText('NTHX')).toBeVisible()
    expect(screen.getByText('Northfield Analytics')).toBeVisible()
    expect(screen.getByText(/Information Technology.*Semiconductors/)).toBeVisible()
  })

  it('shows the facts about a company that are true, as tags', () => {
    renderList()
    expect(screen.getByText('Mega cap')).toBeVisible()
    expect(screen.getByText('0.4% yield')).toBeVisible()
  })

  it('reports which company was tapped rather than selecting it itself', async () => {
    const { onToggleCompany } = renderList()
    await userEvent.click(screen.getByRole('button', { pressed: false, name: /OKHP/ }))
    expect(onToggleCompany).toHaveBeenCalledWith('c3')
  })

  it('announces a selected company as pressed, not only as colored', () => {
    renderList()
    expect(screen.getByRole('button', { name: /NTHX/, pressed: true })).toBeVisible()
    expect(screen.getByRole('button', { name: /OKHP/, pressed: false })).toBeVisible()
  })

  it('reports a request for one company’s details', async () => {
    const { onOpenCompany } = renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Details for NTHX' }))
    expect(onOpenCompany).toHaveBeenCalledWith('c1')
  })

  it('reports which grouping was chosen', async () => {
    const { onSelectGroup } = renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Health Care' }))
    expect(onSelectGroup).toHaveBeenCalledWith('Health Care')
  })

  it('says so when the chosen grouping holds nothing', () => {
    renderList({ companies: [] })
    expect(screen.getByText('No companies in that sector.')).toBeVisible()
  })
})
