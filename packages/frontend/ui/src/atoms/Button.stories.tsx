import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: { children: 'Start run' },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { variant: 'primary' } }
export const Secondary: Story = { args: { variant: 'secondary', children: 'Cash out now' } }
export const Ghost: Story = { args: { variant: 'ghost', children: '+ Data' } }
export const Buy: Story = { args: { variant: 'buy', children: 'Trade' } }
export const Sell: Story = { args: { variant: 'sell', children: 'Sell' } }
export const Disabled: Story = { args: { disabled: true, children: 'Continue this run' } }
export const Icon: Story = {
  args: { variant: 'ghost', icon: true, label: 'Realism settings', children: '⚙' },
}

export const Sizes: Story = {
  render: (args) => (
    <div className="app-row">
      <Button {...args} size="sm" />
      <Button {...args} size="md" />
      <Button {...args} size="lg" />
    </div>
  ),
}
