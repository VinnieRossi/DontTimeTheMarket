import type { Meta, StoryObj } from '@storybook/react-vite'
import { PendingOrderList } from './PendingOrderList'

const meta = {
  title: 'Molecules/PendingOrderList',
  component: PendingOrderList,
  args: {
    orders: [
      { id: 1, description: 'buy limit at 94.20' },
      { id: 2, description: 'sell takeProfit at 112.00' },
    ],
    onCancel: () => undefined,
  },
} satisfies Meta<typeof PendingOrderList>

export default meta

type Story = StoryObj<typeof meta>

export const TwoWaiting: Story = {}
export const OneWaiting: Story = { args: { orders: [{ id: 1, description: 'buy market' }] } }
