import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_COMPANY_DETAIL } from '../story-support'
import { CompanySheet } from './CompanySheet'

/** A sheet opens over a screen, so the story gives it one rather than floating over nothing. */
const overAScreen: Decorator = (Story) => (
  <div style={{ minHeight: '100vh' }}>
    <Story />
  </div>
)

const meta = {
  title: 'Organisms/CompanySheet',
  component: CompanySheet,
  parameters: { layout: 'fullscreen' },
  decorators: [overAScreen],
  args: {
    company: SAMPLE_COMPANY_DETAIL,
    action: { label: 'Add to portfolio', enabled: true },
    onAct: () => undefined,
    onClose: () => undefined,
  },
} satisfies Meta<typeof CompanySheet>

export default meta

type Story = StoryObj<typeof meta>

export const WithTrends: Story = {}

export const NoFilingsToShow: Story = {
  args: { company: { ...SAMPLE_COMPANY_DETAIL, trends: [] } },
}

export const AlreadyHeld: Story = {
  args: { action: { label: 'Already in your portfolio', enabled: false } },
}
