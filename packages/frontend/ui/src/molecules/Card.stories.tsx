import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from './Card'

const meta = {
  title: 'Molecules/Card',
  component: Card,
  args: {
    children: <p className="app-text-muted">Everything on a screen sits on one of these.</p>,
  },
} satisfies Meta<typeof Card>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Roomy: Story = { args: { roomy: true } }
