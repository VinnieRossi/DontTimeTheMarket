import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: { children: 'Save note' },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { variant: 'primary' } }
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Danger: Story = { args: { variant: 'danger', children: 'Delete note' } }
export const Disabled: Story = { args: { disabled: true } }
export const Busy: Story = { args: { busy: true, children: 'Saving' } }

export const Sizes: Story = {
  render: (args) => (
    <div className="app-row">
      <Button {...args} size="sm" />
      <Button {...args} size="md" />
      <Button {...args} size="lg" />
    </div>
  ),
}
