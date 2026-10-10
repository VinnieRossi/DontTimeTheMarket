import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { TradeSheet } from './TradeSheet'

/** A sheet opens over a screen, so the story gives it one rather than floating over nothing. */
const overAScreen: Decorator = (Story) => (
  <div style={{ minHeight: '100vh' }}>
    <Story />
  </div>
)

const meta = {
  title: 'Organisms/TradeSheet',
  component: TradeSheet,
  parameters: { layout: 'fullscreen' },
  decorators: [overAScreen],
  args: {
    pending: [],
    onSubmit: () => undefined,
    onCancelOrder: () => undefined,
    onClose: () => undefined,
  },
} satisfies Meta<typeof TradeSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Buying: Story = {}

export const WithPendingOrders: Story = {
  args: {
    pending: [
      { id: 1, description: 'buy limit at 94.20' },
      { id: 2, description: 'sell stop at 88.00' },
    ],
  },
}

export const TradingOneHolding: Story = {
  args: { subject: 'NTHX', marketOnly: true },
}
