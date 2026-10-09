import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_SPEEDS } from '../story-support'
import { SpeedControls } from './SpeedControls'

const meta = {
  title: 'Molecules/SpeedControls',
  component: SpeedControls,
  args: {
    options: SAMPLE_SPEEDS,
    current: '1x',
    onSelect: () => undefined,
    onStep: () => undefined,
  },
} satisfies Meta<typeof SpeedControls>

export default meta

type Story = StoryObj<typeof meta>

export const Running: Story = {}
export const Paused: Story = { args: { current: 'paused' } }
