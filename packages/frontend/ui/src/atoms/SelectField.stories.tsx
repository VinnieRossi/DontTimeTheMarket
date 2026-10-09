import type { Meta, StoryObj } from '@storybook/react-vite'
import { SelectField } from './SelectField'

const meta = {
  title: 'Atoms/SelectField',
  component: SelectField,
  args: {
    id: 'order-type',
    label: 'Order type',
    value: 'market',
    options: [
      { value: 'market', label: 'Market' },
      { value: 'limit', label: 'Limit (buy if price falls to...)' },
    ],
    onChange: () => undefined,
  },
} satisfies Meta<typeof SelectField>

export default meta

type Story = StoryObj<typeof meta>

export const Market: Story = {}
export const Limit: Story = { args: { value: 'limit' } }
export const Disabled: Story = { args: { disabled: true } }
