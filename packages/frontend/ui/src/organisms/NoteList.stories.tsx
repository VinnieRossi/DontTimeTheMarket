import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import type { NoteView } from '../domain/note-view'
import { NoteList } from './NoteList'

const notes: NoteView[] = [
  {
    id: 'note_1',
    title: 'Rewrite the onboarding copy',
    body: 'The second paragraph repeats the first.',
    status: 'draft',
    statusTone: 'neutral',
    savedAt: new Date('2026-04-01T12:00:00.000Z'),
  },
  {
    id: 'note_2',
    title: 'Ship the pricing page',
    body: 'Copy is approved and the layout is built.',
    status: 'published',
    statusTone: 'success',
    savedAt: new Date('2026-03-28T09:30:00.000Z'),
  },
]

const meta = {
  title: 'Organisms/NoteList',
  component: NoteList,
  args: { notes },
} satisfies Meta<typeof NoteList>

export default meta

type Story = StoryObj<typeof meta>

export const WithNotes: Story = {}
export const Loading: Story = { args: { notes: [], isLoading: true } }
export const Failed: Story = { args: { notes: [], error: 'Could not load notes.' } }
export const Empty: Story = { args: { notes: [] } }
export const Openable: Story = { args: { onOpen: fn() } }
