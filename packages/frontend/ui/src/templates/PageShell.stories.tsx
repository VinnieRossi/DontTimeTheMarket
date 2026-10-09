import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from '../molecules/Card'
import { PageShell } from './PageShell'

const meta = {
  title: 'Templates/PageShell',
  component: PageShell,
  parameters: { layout: 'fullscreen' },
  args: {
    brand: "Don't Time The Market",
    children: <Card>The screen goes here.</Card>,
  },
} satisfies Meta<typeof PageShell>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Narrow: Story = { args: { narrow: true } }
