import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_HOLDINGS } from '../story-support'
import { HoldingsList } from './HoldingsList'

const meta = {
  title: 'Molecules/HoldingsList',
  component: HoldingsList,
  args: {
    holdings: SAMPLE_HOLDINGS,
    emptyNote: 'Every position is sold. You are entirely in cash.',
    onTradeHolding: () => undefined,
  },
} satisfies Meta<typeof HoldingsList>

export default meta

type Story = StoryObj<typeof meta>

export const ThreeHoldings: Story = {}
export const OneHolding: Story = { args: { holdings: SAMPLE_HOLDINGS.slice(0, 1) } }
export const AllInCash: Story = { args: { holdings: [] } }
