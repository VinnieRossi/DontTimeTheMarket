import type { Meta, StoryObj } from '@storybook/react-vite'
import { ToggleChip } from './ToggleChip'

const meta = {
  title: 'Atoms/ToggleChip',
  component: ToggleChip,
  args: { children: '25%', selected: false, onSelect: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ToggleChip>

export default meta

type Story = StoryObj<typeof meta>

export const Unselected: Story = {}
export const Selected: Story = { args: { selected: true } }
export const Medium: Story = { args: { size: 'md', children: 'Standard - 3 years' } }
export const MediumSelected: Story = {
  args: { size: 'md', selected: true, children: 'Standard - 3 years' },
}
