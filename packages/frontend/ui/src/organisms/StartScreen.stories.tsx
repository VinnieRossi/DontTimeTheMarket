import type { Meta, StoryObj } from '@storybook/react-vite'
import { SAMPLE_RUN_LENGTHS } from '../story-support'
import { StartScreen } from './StartScreen'

const meta = {
  title: 'Organisms/StartScreen',
  component: StartScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    heading: 'Think you can beat the market?',
    lede: 'Trade a real, randomized slice of market history. Calendar dates and price levels are hidden, so no peeking at "oh, it\'s 2008." At the end, we compare you to the Bogle NPC: a disciplined buy-and-hold benchmark that never panics and never skips a dividend.',
    runLengths: SAMPLE_RUN_LENGTHS,
    selectedRunLength: 'standard',
    footnote: 'Scores are not saved anywhere yet; this build is index mode only.',
    onSelectRunLength: () => undefined,
    onStart: () => undefined,
  },
} satisfies Meta<typeof StartScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Standard: Story = {}
export const LongRun: Story = { args: { selectedRunLength: 'long' } }

export const WithPortfolioModeOffered: Story = {
  args: {
    secondaryLabel: 'Build a stock portfolio instead',
    onSecondary: () => undefined,
  },
}
