import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button'
import { StatusBadge } from '../atoms/StatusBadge'
import { BottomSheet } from './BottomSheet'

/** A sheet opens over a screen, so the story gives it one rather than floating over nothing. */
const overAScreen: Decorator = (Story) => (
  <div style={{ minHeight: '100vh' }}>
    <Story />
  </div>
)

const meta = {
  title: 'Molecules/BottomSheet',
  component: BottomSheet,
  parameters: { layout: 'fullscreen' },
  decorators: [overAScreen],
  args: {
    title: 'Add data',
    lede: 'Pile these on to see how far you can push it.',
    children: <p className="app-text-muted">Whatever the sheet is for goes here.</p>,
    footer: (
      <Button variant="secondary" fullWidth>
        Close
      </Button>
    ),
    onClose: () => undefined,
  },
} satisfies Meta<typeof BottomSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithBadge: Story = { args: { badge: <StatusBadge>Overkill</StatusBadge> } }
