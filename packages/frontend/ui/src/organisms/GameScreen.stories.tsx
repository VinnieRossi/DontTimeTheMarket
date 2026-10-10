import type { Meta, StoryObj } from '@storybook/react-vite'
import { HoldingsList } from '../molecules/HoldingsList'
import { MarketChart } from '../molecules/MarketChart'
import {
  SAMPLE_HOLDINGS,
  SAMPLE_LEGEND,
  SAMPLE_MARKERS,
  SAMPLE_READOUTS,
  SAMPLE_SERIES,
  SAMPLE_SPEEDS,
  SAMPLE_TILES,
} from '../story-support'
import { GameScreen } from './GameScreen'

const meta = {
  title: 'Organisms/GameScreen',
  component: GameScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    chart: <MarketChart series={SAMPLE_SERIES} markers={SAMPLE_MARKERS} />,
    dayLabel: 'Day 120 / 756',
    speeds: SAMPLE_SPEEDS,
    currentSpeed: '1x',
    legend: SAMPLE_LEGEND,
    readouts: [],
    playerFigure: { label: 'You', value: '$10,604' },
    benchmarkFigure: { label: 'Bogle NPC', value: '$10,355' },
    tiles: SAMPLE_TILES,
    cashOut: { label: 'Cash out now', enabled: true },
    onSelectSpeed: () => undefined,
    onStep: () => undefined,
    onOpenTrade: () => undefined,
    onOpenData: () => undefined,
    onOpenSettings: () => undefined,
    onCashOut: () => undefined,
  },
} satisfies Meta<typeof GameScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Running: Story = {}

export const WithCommentary: Story = {
  args: { commentary: 'That is a lot of trades for someone who could have just... not.' },
}

export const Overloaded: Story = {
  args: {
    readouts: SAMPLE_READOUTS,
    currentSpeed: '16x',
    tiles: [
      { label: 'Cash', value: '$120' },
      { label: 'Position', value: '88.10 sh ($9,940)' },
      { label: 'Vs Bogle NPC', value: '-6.1%', direction: 'down' },
    ],
  },
}

export const BeforeScoringUnlocks: Story = {
  args: {
    dayLabel: 'Day 8 / 756',
    cashOut: { label: 'Cash out (unlocks day 42)', enabled: false },
  },
}

export const RunningAPortfolio: Story = {
  args: {
    legend: [
      { role: 'player', label: 'Your portfolio' },
      { role: 'benchmark', label: 'Bogle NPC' },
    ],
    tiles: [
      { label: 'Cash', value: '$40' },
      { label: 'Holdings', value: '3 companies' },
      { label: 'Vs Bogle NPC', value: '+1.9%', direction: 'up' },
    ],
    tradeLabel: 'Buy a company',
    rebalance: { label: 'Rebalance', enabled: true },
    onRebalance: () => undefined,
    holdings: (
      <HoldingsList
        holdings={SAMPLE_HOLDINGS}
        emptyNote="Every position is sold. You are entirely in cash."
        onTradeHolding={() => undefined}
      />
    ),
  },
}

export const APortfolioSoldDownToCash: Story = {
  args: {
    tradeLabel: 'Buy a company',
    rebalance: { label: 'Nothing to rebalance', enabled: false },
    onRebalance: () => undefined,
    holdings: (
      <HoldingsList
        holdings={[]}
        emptyNote="Every position is sold. You are entirely in cash."
        onTradeHolding={() => undefined}
      />
    ),
  },
}
