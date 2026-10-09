import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_SWITCHES } from '../story-support'
import { SettingsSheet } from './SettingsSheet'

/** A sheet opens over a screen, so the story gives it one rather than floating over nothing. */
const overAScreen: Decorator = (Story) => (
  <div style={{ minHeight: '100vh' }}>
    <Story />
  </div>
)

const meta = {
  title: 'Organisms/SettingsSheet',
  component: SettingsSheet,
  parameters: { layout: 'fullscreen' },
  decorators: [overAScreen],
  args: { switches: SAMPLE_SWITCHES, onToggle: () => undefined, onClose: () => undefined },
} satisfies Meta<typeof SettingsSheet>

export default meta

type Story = StoryObj<typeof meta>

export const EverythingOn: Story = {}

export const EverythingOff: Story = {
  args: { switches: SAMPLE_SWITCHES.map((item) => ({ ...item, checked: false })) },
}
