import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_MARKERS, SAMPLE_SERIES, SAMPLE_SERIES_WITH_OVERLAYS } from '../story-support'
import { MarketChart } from './MarketChart'

const meta = {
  title: 'Molecules/MarketChart',
  component: MarketChart,
  args: { series: SAMPLE_SERIES },
} satisfies Meta<typeof MarketChart>

export default meta

type Story = StoryObj<typeof meta>

export const ThreeLines: Story = {}
export const WithTrades: Story = { args: { markers: SAMPLE_MARKERS } }
export const WithOverlays: Story = { args: { series: SAMPLE_SERIES_WITH_OVERLAYS } }
