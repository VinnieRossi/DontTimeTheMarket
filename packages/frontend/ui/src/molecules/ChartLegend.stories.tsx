import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_LEGEND } from '../story-support'
import { ChartLegend } from './ChartLegend'

const meta = {
  title: 'Molecules/ChartLegend',
  component: ChartLegend,
  args: { items: SAMPLE_LEGEND },
} satisfies Meta<typeof ChartLegend>

export default meta

type Story = StoryObj<typeof meta>

export const ThreeLines: Story = {}

export const EveryOverlay: Story = {
  args: {
    items: [
      ...SAMPLE_LEGEND,
      { role: 'sma20', label: 'SMA 20' },
      { role: 'sma50', label: 'SMA 50' },
      { role: 'bollingerUpper', label: 'Bollinger Bands' },
    ],
  },
}
