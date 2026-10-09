import type { Meta, StoryObj } from '@storybook/react-vite'
import { Switch } from './Switch'

const meta = {
  title: 'Atoms/Switch',
  component: Switch,
  args: { label: 'Capital gains tax', checked: true, onChange: () => undefined },
} satisfies Meta<typeof Switch>

export default meta

type Story = StoryObj<typeof meta>

export const On: Story = {}
export const Off: Story = { args: { checked: false, label: 'Auto-reinvest my dividends' } }
