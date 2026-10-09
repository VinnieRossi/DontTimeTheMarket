import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Button } from './atoms/Button'
import { Checkbox } from './atoms/Checkbox'
import { NumberField } from './atoms/NumberField'
import { SelectField } from './atoms/SelectField'
import { Stat } from './atoms/Stat'
import { StatusBadge } from './atoms/StatusBadge'
import { Switch } from './atoms/Switch'
import { ToggleChip } from './atoms/ToggleChip'
import { BottomSheet } from './molecules/BottomSheet'
import { Card } from './molecules/Card'
import { ChartLegend } from './molecules/ChartLegend'
import { MarketChart } from './molecules/MarketChart'
import { PendingOrderList } from './molecules/PendingOrderList'
import { ReadoutList } from './molecules/ReadoutList'
import { SpeedControls } from './molecules/SpeedControls'
import { AddDataSheet } from './organisms/AddDataSheet'
import { EndScreen } from './organisms/EndScreen'
import { GameScreen } from './organisms/GameScreen'
import { SettingsSheet } from './organisms/SettingsSheet'
import { StartScreen } from './organisms/StartScreen'
import { TradeSheet } from './organisms/TradeSheet'
import {
  SAMPLE_INDICATOR_TIERS,
  SAMPLE_LEGEND,
  SAMPLE_READOUTS,
  SAMPLE_RUN_LENGTHS,
  SAMPLE_SCORES,
  SAMPLE_SERIES,
  SAMPLE_SPEEDS,
  SAMPLE_SWITCHES,
  SAMPLE_TILES,
} from './story-support'
import { PageShell } from './templates/PageShell'

/**
 * Accessibility asserted by a test rather than reviewed by eye. An engine catches the mechanical
 * failures, which is most of them: an input with no label, a control with no name, a heading order
 * that skips a level. It does not catch whether the screen makes sense, so it is a floor and not a
 * ceiling.
 *
 * Every exported component is here. A component added without a row in this table is a component
 * nobody checked.
 *
 * Color contrast is switched off here rather than silently passing: measuring it needs a real
 * renderer, and the test environment has none, so an engine run here would report nothing and look
 * like a pass. Contrast is checked instead where a real browser is doing the rendering, by the
 * accessibility addon that runs against every story.
 *
 * The charting library is substituted for the same reason its own test substitutes it: it paints
 * onto a canvas this renderer does not have.
 */
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn() })),
    removeSeries: vi.fn(),
    applyOptions: vi.fn(),
    remove: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
  })),
  createSeriesMarkers: vi.fn(() => ({ setMarkers: vi.fn() })),
  LineSeries: 'line-series',
}))

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }
const noop = (): void => undefined

const cases: readonly [string, ReactElement][] = [
  ['Button', <Button key="button">Start run</Button>],
  [
    'Button, disabled',
    <Button key="button-disabled" disabled>
      Continue this run
    </Button>,
  ],
  [
    'Button, icon only',
    <Button key="button-icon" icon label="Realism settings">
      {'⚙'}
    </Button>,
  ],
  [
    'ToggleChip',
    <ToggleChip key="chip" selected onSelect={noop}>
      4x
    </ToggleChip>,
  ],
  ['StatusBadge', <StatusBadge key="badge">Full Terminal Mode</StatusBadge>],
  [
    'NumberField',
    <NumberField key="number" id="percent" label="% of cash" value="25" onChange={noop} />,
  ],
  [
    'NumberField with an error',
    <NumberField
      key="number-error"
      id="percent"
      label="% of cash"
      value="0"
      error="A trade has to be at least 1 percent"
      onChange={noop}
    />,
  ],
  [
    'SelectField',
    <SelectField
      key="select"
      id="order-type"
      label="Order type"
      value="market"
      options={[{ value: 'market', label: 'Market' }]}
      onChange={noop}
    />,
  ],
  ['Checkbox', <Checkbox key="checkbox" id="rsi" label="RSI (14)" checked onChange={noop} />],
  ['Switch', <Switch key="switch" label="Capital gains tax" checked onChange={noop} />],
  ['Stat', <Stat key="stat" surface="tile" label="Cash" value="$3,480" />],
  ['Card', <Card key="card">Inside</Card>],
  ['ChartLegend', <ChartLegend key="legend" items={SAMPLE_LEGEND} />],
  ['MarketChart', <MarketChart key="chart" series={SAMPLE_SERIES} />],
  ['ReadoutList', <ReadoutList key="readouts" items={SAMPLE_READOUTS} />],
  [
    'SpeedControls',
    <SpeedControls
      key="speeds"
      options={SAMPLE_SPEEDS}
      current="1x"
      onSelect={noop}
      onStep={noop}
    />,
  ],
  [
    'PendingOrderList',
    <PendingOrderList
      key="orders"
      orders={[{ id: 1, description: 'buy limit at 94.20' }]}
      onCancel={noop}
    />,
  ],
  [
    'BottomSheet',
    <BottomSheet key="sheet" title="Trade" footer={<Button>Close</Button>} onClose={noop}>
      <p>Body</p>
    </BottomSheet>,
  ],
  [
    'PageShell',
    <PageShell key="shell" brand="Don't Time The Market">
      <Card>Inside</Card>
    </PageShell>,
  ],
  [
    'StartScreen',
    <StartScreen
      key="start"
      heading="Think you can beat the market?"
      lede="Trade a real, randomized slice of market history."
      runLengths={SAMPLE_RUN_LENGTHS}
      selectedRunLength="standard"
      footnote="Scores are not saved anywhere yet."
      onSelectRunLength={noop}
      onStart={noop}
    />,
  ],
  [
    'GameScreen',
    <GameScreen
      key="game"
      chart={<div />}
      dayLabel="Day 120 / 756"
      speeds={SAMPLE_SPEEDS}
      currentSpeed="1x"
      legend={SAMPLE_LEGEND}
      readouts={SAMPLE_READOUTS}
      playerFigure={{ label: 'You', value: '$10,604' }}
      benchmarkFigure={{ label: 'Bogle NPC', value: '$10,355' }}
      commentary="Have you considered doing nothing?"
      tiles={SAMPLE_TILES}
      cashOut={{ label: 'Cash out now', enabled: true }}
      onSelectSpeed={noop}
      onStep={noop}
      onOpenTrade={noop}
      onOpenData={noop}
      onOpenSettings={noop}
      onCashOut={noop}
    />,
  ],
  [
    'EndScreen',
    <EndScreen
      key="end"
      heading="You beat the Bogle NPC"
      edge="+184 bps"
      won
      verdict="A small win over a short horizon happens more than you would think."
      scores={SAMPLE_SCORES}
      continueAction={{ label: 'Continue this run', enabled: true }}
      onContinue={noop}
      onPlayAgain={noop}
    />,
  ],
  [
    'TradeSheet',
    <TradeSheet
      key="trade"
      pending={[{ id: 1, description: 'buy limit at 94.20' }]}
      onSubmit={noop}
      onCancelOrder={noop}
      onClose={noop}
    />,
  ],
  [
    'AddDataSheet',
    <AddDataSheet
      key="data"
      tiers={SAMPLE_INDICATOR_TIERS}
      complexity="Busy"
      onToggle={noop}
      onClose={noop}
    />,
  ],
  [
    'SettingsSheet',
    <SettingsSheet key="settings" switches={SAMPLE_SWITCHES} onToggle={noop} onClose={noop} />,
  ],
]

describe('accessibility', () => {
  it.each(cases)('%s has no violations an engine can detect', async (_name, element) => {
    const { container } = render(element)
    const results = await axe(container, AXE_OPTIONS)
    expect(results.violations).toEqual([])
  })
})
