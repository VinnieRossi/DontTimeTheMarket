import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_COMPANIES, SAMPLE_SECTOR_GROUPS } from '../story-support'
import { CompanyPickerSheet } from './CompanyPickerSheet'

/** A sheet opens over a screen, so the story gives it one rather than floating over nothing. */
const overAScreen: Decorator = (Story) => (
  <div style={{ minHeight: '100vh' }}>
    <Story />
  </div>
)

const meta = {
  title: 'Organisms/CompanyPickerSheet',
  component: CompanyPickerSheet,
  parameters: { layout: 'fullscreen' },
  decorators: [overAScreen],
  args: {
    companies: SAMPLE_COMPANIES.map((company) => ({ ...company, selected: false })),
    groups: SAMPLE_SECTOR_GROUPS,
    currentGroup: 'all',
    emptyNote: 'No companies in that sector.',
    lede: 'Any company on the roster, held or not. It fills at tomorrow’s price.',
    onSelectGroup: () => undefined,
    onPick: () => undefined,
    onOpenCompany: () => undefined,
    onClose: () => undefined,
  },
} satisfies Meta<typeof CompanyPickerSheet>

export default meta

type Story = StoryObj<typeof meta>

export const TheWholeRoster: Story = {}
export const NarrowedToOneSector: Story = { args: { currentGroup: 'Health Care' } }
