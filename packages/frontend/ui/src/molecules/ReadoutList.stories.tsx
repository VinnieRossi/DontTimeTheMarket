import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_READOUTS } from '../story-support'
import { ReadoutList } from './ReadoutList'

const meta = {
  title: 'Molecules/ReadoutList',
  component: ReadoutList,
  args: { items: SAMPLE_READOUTS },
} satisfies Meta<typeof ReadoutList>

export default meta

type Story = StoryObj<typeof meta>

export const AFew: Story = {}

export const Overloaded: Story = {
  args: {
    items: [
      ...SAMPLE_READOUTS,
      { key: 'cpi', label: 'CPI index', value: '312.3' },
      { key: 'unemployment', label: 'Unemployment', value: '4.1%' },
      { key: 'fedFunds', label: 'Fed funds rate', value: '5.33%' },
      { key: 'm2', label: 'M2 money supply', value: '21085' },
      { key: 'yieldCurve', label: 'Yield curve 10y-2y', value: '-0.42%' },
    ],
  },
}
