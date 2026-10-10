import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  SAMPLE_ALLOCATIONS,
  SAMPLE_COMPANIES,
  SAMPLE_HALL_OF_FAME,
  SAMPLE_RUN_LENGTHS,
  SAMPLE_SECTOR_GROUPS,
} from '../story-support'
import { PortfolioBuilder } from './PortfolioBuilder'

const meta = {
  title: 'Organisms/PortfolioBuilder',
  component: PortfolioBuilder,
  parameters: { layout: 'fullscreen' },
  args: {
    heading: 'Build your portfolio',
    lede: 'Real company histories, generated names. The sector, the industry and the numbers are true; the name is not. Pick a few, then split the money between them.',
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
    survivorshipNote:
      'Every free source of daily company history serves only companies that are still listed, so this roster is a survivors-only sample. That makes picking stocks look easier here than it is.',
    hallOfFameHeading: 'Hall of Fame (not tradeable)',
    hallOfFame: SAMPLE_HALL_OF_FAME,
    hallOfFameNote: 'The collapses the data cannot carry, as history rather than as a trade.',
    onSelectGroup: () => undefined,
    onToggleCompany: () => undefined,
    onOpenCompany: () => undefined,
    onSelectRunLength: () => undefined,
    onIncrease: () => undefined,
    onDecrease: () => undefined,
    onSplitEvenly: () => undefined,
    onStart: () => undefined,
    onBack: () => undefined,
  },
} satisfies Meta<typeof PortfolioBuilder>

export default meta

type Story = StoryObj<typeof meta>

export const TwoCompaniesPicked: Story = {}

export const NothingPickedYet: Story = {
  args: {
    companies: SAMPLE_COMPANIES.map((company) => ({ ...company, selected: false })),
    allocations: [],
    start: { label: 'Pick at least one company', enabled: false },
  },
}
