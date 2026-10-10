import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stepper } from './Stepper'

const meta = {
  title: 'Atoms/Stepper',
  component: Stepper,
  args: {
    value: '35%',
    label: 'NTHX allocation',
    onIncrease: () => undefined,
    onDecrease: () => undefined,
  },
} satisfies Meta<typeof Stepper>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const AtTheFloor: Story = { args: { value: '0%', canDecrease: false } }
export const AtTheCeiling: Story = { args: { value: '100%', canIncrease: false } }
