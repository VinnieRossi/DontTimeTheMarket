import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TextField } from './TextField'

const meta = {
  title: 'Atoms/TextField',
  component: TextField,
  args: { id: 'title', label: 'Title', value: '', onChange: fn() },
} satisfies Meta<typeof TextField>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const Filled: Story = { args: { value: 'Rewrite the onboarding copy' } }
export const WithPlaceholder: Story = { args: { placeholder: 'What is this note about?' } }
export const Multiline: Story = { args: { id: 'body', label: 'Body', rows: 4 } }
export const WithError: Story = { args: { value: '', error: 'A title is required' } }
export const Disabled: Story = { args: { value: 'Locked', disabled: true } }
