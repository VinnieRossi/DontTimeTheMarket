import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { Sparkline } from './Sparkline'

const rising = Array.from({ length: 40 }, (_, day) => ({
  day,
  value: 100 + day * 0.8 + Math.sin(day / 4) * 3,
}))
const falling = rising.map((point) => ({ day: point.day, value: 200 - point.value }))

/** A sparkline stretches to its column, so the story gives it one to stretch into. */
const inALane: Decorator = (Story) => (
  <div style={{ width: 180 }}>
    <Story />
  </div>
)

const meta = {
  title: 'Atoms/Sparkline',
  component: Sparkline,
  args: { points: rising, label: 'Price line' },
  decorators: [inALane],
} satisfies Meta<typeof Sparkline>

export default meta

type Story = StoryObj<typeof meta>

export const Rising: Story = {}
export const Falling: Story = { args: { points: falling } }
export const Neutral: Story = { args: { tone: 'neutral', label: 'Revenue trend' } }
export const TooShortToDraw: Story = { args: { points: [{ day: 0, value: 100 }] } }
