import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  SAMPLE_ALLOCATIONS,
  SAMPLE_COMPANIES,
  SAMPLE_HALL_OF_FAME,
  SAMPLE_RUN_LENGTHS,
  SAMPLE_SECTOR_GROUPS,
} from '../story-support'
import { PortfolioBuilder, type PortfolioBuilderProps } from './PortfolioBuilder'

const SURVIVORSHIP = 'This roster only holds companies that are still listed today.'

function renderBuilder(overrides: Partial<PortfolioBuilderProps> = {}) {
  const props: PortfolioBuilderProps = {
    heading: 'Build your portfolio',
    lede: 'Real histories, generated names.',
    companies: SAMPLE_COMPANIES,
    groups: SAMPLE_SECTOR_GROUPS,
    currentGroup: 'all',
    emptyNote: 'No companies in that sector.',
    runLengths: SAMPLE_RUN_LENGTHS,
    selectedRunLength: 'standard',
    allocations: SAMPLE_ALLOCATIONS,
    allocationTotal: 'Total: 100%',
    allocationComplete: true,
    allocationPrompt: 'Pick a company above and it appears here.',
    start: { label: 'Start run with this portfolio', enabled: true },
    survivorshipNote: SURVIVORSHIP,
    hallOfFameHeading: 'Hall of Fame (not tradeable)',
    hallOfFame: SAMPLE_HALL_OF_FAME,
    hallOfFameNote: 'History rather than a trade.',
    onSelectGroup: vi.fn(),
    onToggleCompany: vi.fn(),
    onOpenCompany: vi.fn(),
    onSelectRunLength: vi.fn(),
    onIncrease: vi.fn(),
    onDecrease: vi.fn(),
    onSplitEvenly: vi.fn(),
    onStart: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  }
  render(<PortfolioBuilder {...props} />)
  return props
}

describe('PortfolioBuilder', () => {
  it('shows the roster, the split, and the run length as three things to do', () => {
    renderBuilder()
    expect(screen.getByRole('heading', { name: 'Build your portfolio' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Companies' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Allocation' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Run length' })).toBeVisible()
  })

  it('asks for a pick rather than showing an empty split', () => {
    renderBuilder({ allocations: [] })
    expect(screen.getByText('Pick a company above and it appears here.')).toBeVisible()
    expect(screen.queryByText('Total: 100%')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Split evenly' })).toBeNull()
  })

  it('reports an even split rather than computing one', async () => {
    const { onSplitEvenly } = renderBuilder()
    await userEvent.click(screen.getByRole('button', { name: 'Split evenly' }))
    expect(onSplitEvenly).toHaveBeenCalledTimes(1)
  })

  it('starts the run only when the split holds all of the money', async () => {
    const { onStart } = renderBuilder()
    await userEvent.click(screen.getByRole('button', { name: 'Start run with this portfolio' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('offers no way to start a portfolio that is not ready', () => {
    renderBuilder({
      allocations: [],
      start: { label: 'Pick at least one company', enabled: false },
    })
    expect(screen.getByRole('button', { name: 'Pick at least one company' })).toBeDisabled()
  })

  it('says plainly that the roster only holds companies that survived', () => {
    renderBuilder()
    expect(screen.getByText(SURVIVORSHIP)).toBeVisible()
  })

  it('shows the famous collapses as history, with nothing to tap on them', () => {
    renderBuilder()
    expect(screen.getByText('Enron')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Enron/ })).toBeNull()
  })

  it('reports a run length and a way back out', async () => {
    const { onSelectRunLength, onBack } = renderBuilder()
    await userEvent.click(screen.getByRole('button', { name: 'Short - 1 year' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onSelectRunLength).toHaveBeenCalledWith('short')
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
