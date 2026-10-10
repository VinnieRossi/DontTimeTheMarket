import { Button } from '../atoms/Button'
import { ToggleChip } from '../atoms/ToggleChip'
import type { ChoiceView } from '../domain/game-view'
import { Card } from '../molecules/Card'

export interface StartScreenProps {
  heading: string
  lede: string
  runLengths: readonly ChoiceView[]
  selectedRunLength: string
  footnote: string
  /** The label on the primary action, since the two modes start different kinds of run. */
  startLabel?: string
  /**
   * The other way into the game, when there is one. It is a second button rather than a mode
   * toggle above the run length, because picking companies opens a screen of its own and a toggle
   * would have implied this screen could do both.
   */
  secondaryLabel?: string | undefined
  onSelectRunLength: (value: string) => void
  onStart: () => void
  onSecondary?: (() => void) | undefined
}

/** The screen that opens a run: what the game is, how long it lasts, and one button. */
export function StartScreen({
  heading,
  lede,
  runLengths,
  selectedRunLength,
  footnote,
  startLabel = 'Start run',
  secondaryLabel,
  onSelectRunLength,
  onStart,
  onSecondary,
}: StartScreenProps) {
  return (
    <div className="app-screen-stack">
      <Card roomy>
        <h1 className="app-heading app-heading--lg">{heading}</h1>
        <p className="app-text-muted app-start__lede">{lede}</p>

        <div className="app-start__group">
          <h2 className="app-start__group-title">Run length</h2>
          <div className="app-row app-row--tight">
            {runLengths.map((option) => (
              <ToggleChip
                key={option.value}
                size="md"
                selected={option.value === selectedRunLength}
                onSelect={() => onSelectRunLength(option.value)}
              >
                {option.label}
              </ToggleChip>
            ))}
          </div>
        </div>

        <div className="app-start__action">
          <Button size="lg" fullWidth onClick={onStart}>
            {startLabel}
          </Button>
          {secondaryLabel !== undefined && (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              className="app-start__alternative"
              onClick={() => onSecondary?.()}
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
      </Card>
      <p className="app-start__footnote">{footnote}</p>
    </div>
  )
}
