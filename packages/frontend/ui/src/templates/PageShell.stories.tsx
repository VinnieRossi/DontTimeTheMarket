import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button'
import { PageShell } from './PageShell'

const meta = {
  title: 'Templates/PageShell',
  component: PageShell,
  args: {
    title: 'Notes',
    description: 'Everything written down so far.',
    children: <p>Page content goes here.</p>,
  },
} satisfies Meta<typeof PageShell>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutDescription: Story = {
  render: () => (
    <PageShell title="Notes">
      <p>Page content goes here.</p>
    </PageShell>
  ),
}

export const WithAction: Story = { args: { actions: <Button>New note</Button> } }
