import { cn } from '../lib/cn'

export interface StepperProps {
  /** The current figure, already formatted, because the owner decides how it reads. */
  value: string
  /** What is being stepped, for a reader who only hears the two buttons. */
  label: string
  canIncrease?: boolean
  canDecrease?: boolean
  className?: string | undefined
  onIncrease: () => void
  onDecrease: () => void
}

/**
 * Two round buttons with a figure between them.
 *
 * It is a stepper rather than a slider because the thing it sets is set on a phone with a thumb,
 * and a thin slider handle is a target you miss. Each button is a full touch target and the figure
 * between them is only ever read, never dragged.
 */
export function Stepper({
  value,
  label,
  canIncrease = true,
  canDecrease = true,
  className,
  onIncrease,
  onDecrease,
}: StepperProps) {
  return (
    <div className={cn('app-stepper', className)}>
      <button
        type="button"
        className="app-stepper__button app-focusable"
        aria-label={`Decrease ${label}`}
        disabled={!canDecrease}
        onClick={onDecrease}
      >
        {'−'}
      </button>
      <span className="app-stepper__value">{value}</span>
      <button
        type="button"
        className="app-stepper__button app-focusable"
        aria-label={`Increase ${label}`}
        disabled={!canIncrease}
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  )
}
