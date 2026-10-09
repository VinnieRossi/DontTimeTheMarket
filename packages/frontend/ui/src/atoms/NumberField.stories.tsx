import type { Meta, StoryObj } from '@storybook/react-vite'
import { NumberField } from './NumberField'

const meta = {
  title: 'Atoms/NumberField',
  component: NumberField,
  args: {
    id: 'percent',
    label: '% of cash',
    value: '25',
    min: 1,
    max: 100,
    onChange: () => undefined,
  },
} satisfies Meta<typeof NumberField>

export default meta

type Story = StoryObj<typeof meta>

export const Filled: Story = {}
export const Empty: Story = { args: { value: '', placeholder: 'Limit price' } }
export const WithError: Story = {
  args: { value: '0', error: 'A trade has to be at least 1 percent' },
}
export const Disabled: Story = { args: { disabled: true } }
