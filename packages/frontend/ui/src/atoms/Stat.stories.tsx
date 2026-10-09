import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stat } from './Stat'

const meta = {
  title: 'Atoms/Stat',
  component: Stat,
  args: { label: 'Cash', value: '$3,480' },
} satisfies Meta<typeof Stat>

export default meta

type Story = StoryObj<typeof meta>

export const Bare: Story = { args: { label: 'You', value: '$10,604' } }
export const Tile: Story = { args: { surface: 'tile' } }
export const Sunken: Story = { args: { surface: 'sunken', label: 'Total return', value: '18.4%' } }
export const Up: Story = {
  args: {
    surface: 'tile',
    label: 'Vs Bogle NPC',
    value: '+2.4%',
    direction: 'up',
  },
}
export const Down: Story = {
  args: {
    surface: 'tile',
    label: 'Vs Bogle NPC',
    value: '-6.1%',
    direction: 'down',
  },
}
export const Aligned: Story = {
  args: { align: 'end', label: 'Bogle NPC', value: '$10,980' },
}
