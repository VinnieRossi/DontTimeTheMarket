import { Button } from '../atoms/Button'
import { Stat } from '../atoms/Stat'
import type { ActionView, FigureView } from '../domain/game-view'
import { cn } from '../lib/cn'
import { Card } from '../molecules/Card'

export interface EndScreenProps {
  heading: string
  /** The score, already written out with its sign and unit. */
  edge: string
  won: boolean
  verdict: string
  scores: readonly FigureView[]
  continueAction: ActionView
  onContinue: () => void
  onPlayAgain: () => void
}

/** The scoreboard: how the run went against the benchmark, and the two ways out of it. */
export function EndScreen({
  heading,
  edge,
  won,
  verdict,
  scores,
  continueAction,
  onContinue,
  onPlayAgain,
}: EndScreenProps) {
  return (
    <Card roomy className="app-end">
      <h1 className="app-heading app-heading--md">{heading}</h1>
      <div className={cn('app-end__edge', won ? 'app-text-up' : 'app-text-down')}>{edge}</div>
      <p className="app-text-muted app-end__verdict">{verdict}</p>

      <div className="app-end__scores">
        {scores.map((score) => (
          <Stat
            key={score.label}
            surface="sunken"
            label={score.label}
            value={score.value}
            {...(score.direction === undefined ? {} : { direction: score.direction })}
          />
        ))}
      </div>

      <div className="app-end__actions">
        <Button size="lg" fullWidth disabled={!continueAction.enabled} onClick={onContinue}>
          {continueAction.label}
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={onPlayAgain}>
          Play a new run
        </Button>
      </div>
    </Card>
  )
}
