import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_SCORES } from '../story-support'
import { EndScreen } from './EndScreen'

const meta = {
  title: 'Organisms/EndScreen',
  component: EndScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    heading: 'You beat the Bogle NPC',
    edge: '+184 bps',
    won: true,
    verdict:
      "A small win over a short horizon happens more than you'd think. Keep going and the odds start working against you again.",
    scores: SAMPLE_SCORES,
    continueAction: { label: 'Continue this run', enabled: true },
    onContinue: () => undefined,
    onPlayAgain: () => undefined,
  },
} satisfies Meta<typeof EndScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Won: Story = {}

export const Lost: Story = {
  args: {
    heading: 'The Bogle NPC wins this one',
    edge: '-203 bps',
    won: false,
    verdict:
      'Most players lose to a patient buy-and-hold benchmark. You are now most players. There is some comfort in that, probably.',
    continueAction: { label: 'Continue (only available when winning)', enabled: false },
  },
}

export const OutOfHistory: Story = {
  args: { continueAction: { label: 'Out of history to continue into', enabled: false } },
}
