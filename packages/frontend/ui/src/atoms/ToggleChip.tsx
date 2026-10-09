import { cn } from '../lib/cn'

export interface ToggleChipProps {
  children: string
  /** Reported as the pressed state, so the choice is announced and not only colored. */
  selected: boolean
  size?: 'sm' | 'md'
  className?: string | undefined
  onSelect: () => void
}

/**
 * One option in a row of them: a run length, a speed, a trade size. It reports being chosen
 * rather than holding the choice, because the row below it has to agree on which one is current
 * and only its owner knows that.
 */
export function ToggleChip({
  children,
  selected,
  size = 'sm',
  className,
  onSelect,
}: ToggleChipProps) {
  return (
    <button
      type="button"
      className={cn('app-chip', 'app-focusable', `app-chip--${size}`, className)}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {children}
    </button>
  )
}
