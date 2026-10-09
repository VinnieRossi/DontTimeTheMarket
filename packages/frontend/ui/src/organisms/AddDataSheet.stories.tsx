import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_INDICATOR_TIERS } from '../story-support'
import { AddDataSheet } from './AddDataSheet'

/** A sheet opens over a screen, so the story gives it one rather than floating over nothing. */
const overAScreen: Decorator = (Story) => (
  <div style={{ minHeight: '100vh' }}>
    <Story />
  </div>
)

const meta = {
  title: 'Organisms/AddDataSheet',
  component: AddDataSheet,
  parameters: { layout: 'fullscreen' },
  decorators: [overAScreen],
  args: {
    tiers: SAMPLE_INDICATOR_TIERS,
    complexity: 'Busy',
    onToggle: () => undefined,
    onClose: () => undefined,
  },
} satisfies Meta<typeof AddDataSheet>

export default meta

type Story = StoryObj<typeof meta>

export const TwoTiers: Story = {}
export const FullTerminalMode: Story = { args: { complexity: 'Full Terminal Mode' } }
