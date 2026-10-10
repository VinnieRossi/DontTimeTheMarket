import type { ReactNode } from 'react'
import { Button } from '../atoms/Button'
import { Stat } from '../atoms/Stat'
import type { ActionView, ChoiceView, FigureView } from '../domain/game-view'
import { Card } from '../molecules/Card'
import { ChartLegend, type ChartLegendItem } from '../molecules/ChartLegend'
import { type ReadoutItem, ReadoutList } from '../molecules/ReadoutList'
import { SpeedControls } from '../molecules/SpeedControls'

export interface GameScreenProps {
  /**
   * The chart, handed in rather than built here, so this screen can be rendered and asserted
   * without a canvas and the chart can be exercised on its own.
   */
  chart: ReactNode
  dayLabel: string
  speeds: readonly ChoiceView[]
  currentSpeed: string
  legend: readonly ChartLegendItem[]
  readouts: readonly ReadoutItem[]
  /** The player's value and the benchmark's, side by side, which is the whole scoreboard. */
  playerFigure: FigureView
  benchmarkFigure: FigureView
  commentary?: string | undefined
  tiles: readonly FigureView[]
  cashOut: ActionView
  /**
   * What the run holds, when it holds more than one thing. A portfolio run fills this with its
   * holdings panel; an index run leaves it out, because a single position is already reported by
   * the tiles above.
   */
  holdings?: ReactNode
  /** The label on the button that opens the trade panel, since a basket opens a different one. */
  tradeLabel?: string
  /** Offered only by a run with weights to restore between several holdings. */
  rebalance?: ActionView | undefined
  onSelectSpeed: (value: string) => void
  onStep: () => void
  onOpenTrade: () => void
  onOpenData: () => void
  onOpenSettings: () => void
  onCashOut: () => void
  onRebalance?: (() => void) | undefined
}

/**
 * The running game: the clock, the chart and whatever is piled on it, the two values being
 * compared, and the four things a player can do about any of it.
 */
export function GameScreen({
  chart,
  dayLabel,
  speeds,
  currentSpeed,
  legend,
  readouts,
  playerFigure,
  benchmarkFigure,
  commentary,
  tiles,
  cashOut,
  holdings,
  tradeLabel = 'Trade',
  rebalance,
  onSelectSpeed,
  onStep,
  onOpenTrade,
  onOpenData,
  onOpenSettings,
  onCashOut,
  onRebalance,
}: GameScreenProps) {
  return (
    <div className="app-game">
      <Card className="app-game__hud">
        <div className="app-game__clock">
          <span className="app-game__day">{dayLabel}</span>
          <SpeedControls
            options={speeds}
            current={currentSpeed}
            onSelect={onSelectSpeed}
            onStep={onStep}
          />
        </div>

        {chart}
        <ChartLegend items={legend} />
        <ReadoutList items={readouts} />

        <div className="app-game__values">
          <Stat label={playerFigure.label} value={playerFigure.value} />
          <Stat align="end" label={benchmarkFigure.label} value={benchmarkFigure.value} />
        </div>

        {commentary !== undefined && <p className="app-note">{commentary}</p>}
      </Card>

      <div className="app-game__tiles">
        {tiles.map((tile) => (
          <Stat
            key={tile.label}
            surface="tile"
            label={tile.label}
            value={tile.value}
            {...(tile.direction === undefined ? {} : { direction: tile.direction })}
          />
        ))}
      </div>

      {holdings !== undefined && (
        <Card className="app-game__holdings">
          <h2 className="app-heading app-heading--sm">Your holdings</h2>
          {holdings}
        </Card>
      )}

      <div className="app-game__actions">
        <Button variant="ghost" icon label="Realism settings" onClick={onOpenSettings}>
          {'⚙'}
        </Button>
        <Button variant="ghost" onClick={onOpenData}>
          + Data
        </Button>
        {rebalance !== undefined && (
          <Button variant="secondary" disabled={!rebalance.enabled} onClick={() => onRebalance?.()}>
            {rebalance.label}
          </Button>
        )}
        <Button variant="buy" onClick={onOpenTrade}>
          {tradeLabel}
        </Button>
      </div>

      <div className="app-game__cashout">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          disabled={!cashOut.enabled}
          onClick={onCashOut}
        >
          {cashOut.label}
        </Button>
      </div>
    </div>
  )
}
