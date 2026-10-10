import { Button } from '../atoms/Button'
import { Stat } from '../atoms/Stat'
import type { ActionView, FigureView } from '../domain/game-view'
import type { RevealRowView } from '../domain/portfolio-view'
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
  /**
   * Who the companies actually were. A portfolio run fills this in; an index run has nothing to
   * reveal, since the one thing it traded was never disguised in the first place.
   */
  reveal?: readonly RevealRowView[]
  revealHeading?: string
  revealNote?: string
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
  reveal,
  revealHeading = 'Who you were actually holding',
  revealNote,
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
            {...(score.note === undefined ? {} : { note: score.note })}
          />
        ))}
      </div>

      {reveal !== undefined && reveal.length > 0 && (
        <div className="app-end__reveal">
          <h2 className="app-heading app-heading--sm">{revealHeading}</h2>
          {revealNote !== undefined && <p className="app-text-muted">{revealNote}</p>}
          <ul className="app-reveal">
            {reveal.map((row) => (
              <li key={row.assetId} className="app-reveal__row">
                <span className="app-reveal__disguise">
                  {row.ticker} {'·'} {row.fakeName}
                </span>
                <span className="app-reveal__real">{row.realName}</span>
                <span className="app-reveal__detail">{row.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
