import { TONES } from '@dttm/theme'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatusBadge } from './StatusBadge'

const meta = {
  title: 'Atoms/StatusBadge',
  component: StatusBadge,
  args: { children: 'draft' },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof StatusBadge>

export default meta

type Story = StoryObj<typeof meta>

export const Neutral: Story = { args: { tone: 'neutral' } }
export const Published: Story = { args: { tone: 'success', children: 'published' } }

export const EveryTone: Story = {
  render: () => (
    <div className="app-row">
      {TONES.map((tone) => (
        <StatusBadge key={tone} tone={tone}>
          {tone}
        </StatusBadge>
      ))}
    </div>
  ),
}
