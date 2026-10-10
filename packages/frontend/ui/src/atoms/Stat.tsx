import { cn } from '../lib/cn'

export type StatSurface = 'none' | 'tile' | 'sunken'
export type StatDirection = 'up' | 'down' | 'none'

export interface StatProps {
  label: string
  value: string
  /** What the figure sits on: nothing, a raised tile, or a sunken panel. */
  surface?: StatSurface
  /** Colors the figure when it means a number went up or down, and never otherwise. */
  direction?: StatDirection
  align?: 'start' | 'end'
  /** A short factual line shown as muted subtext under the value, when the figure needs one. */
  note?: string
  className?: string | undefined
}

/** A labeled figure: cash, a position, a score, a gap against the benchmark. */
export function Stat({
  label,
  value,
  surface = 'none',
  direction = 'none',
  align = 'start',
  note,
  className,
}: StatProps) {
  return (
    <div
      className={cn(
        surface === 'tile' && 'app-tile',
        surface === 'sunken' && 'app-tile app-tile--sunken',
        align === 'end' && 'app-stat--end',
        className
      )}
    >
      <div className="app-stat__label">{label}</div>
      <div
        className={cn(
          'app-stat__value',
          direction === 'up' && 'app-text-up',
          direction === 'down' && 'app-text-down'
        )}
      >
        {value}
      </div>
      {note !== undefined && <div className="app-stat__note app-text-muted">{note}</div>}
    </div>
  )
}
