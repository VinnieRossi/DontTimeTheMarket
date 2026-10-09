import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { NoteCard } from './NoteCard'

const note = {
  id: 'note_1',
  title: 'Rewrite the onboarding copy',
  body: 'The second paragraph repeats the first, and neither says what the reader has to do next.',
  status: 'draft',
  statusTone: 'neutral' as const,
  savedAt: new Date('2026-04-01T12:00:00.000Z'),
}

const meta = {
  title: 'Molecules/NoteCard',
  component: NoteCard,
  args: { note },
} satisfies Meta<typeof NoteCard>

export default meta

type Story = StoryObj<typeof meta>

export const Draft: Story = {}

export const Published: Story = {
  args: { note: { ...note, status: 'published', statusTone: 'success' } },
}

export const Openable: Story = {
  args: { onOpen: fn() },
}

export const LongBody: Story = {
  args: { note: { ...note, body: 'A sentence that keeps going. '.repeat(20) } },
}
