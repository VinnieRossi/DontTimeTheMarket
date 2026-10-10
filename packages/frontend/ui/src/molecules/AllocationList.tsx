import { Stepper } from '../atoms/Stepper'
import type { AllocationRowView } from '../domain/portfolio-view'
import { cn } from '../lib/cn'

export interface AllocationListProps {
  rows: readonly AllocationRowView[]
  /** The running total, already formatted, and whether it adds up. */
  total: string
  complete: boolean
  className?: string | undefined
  onIncrease: (assetId: string) => void
  onDecrease: (assetId: string) => void
}

/**
 * How the money is split between the companies that were picked.
 *
 * The total is shown rather than inferred, because the one promise this screen makes is that it
 * always adds up to everything. Nudging a holding is the owner's job to resolve: this reports
 * which one moved and in which direction and nothing else.
 */
export function AllocationList({
  rows,
  total,
  complete,
  className,
  onIncrease,
  onDecrease,
}: AllocationListProps) {
  return (
    <div className={cn('app-alloc', className)}>
      <ul className="app-alloc__rows">
        {rows.map((row) => (
          <li key={row.assetId} className="app-alloc__row">
            <span className="app-alloc__who">
              <span className="app-alloc__ticker">{row.ticker}</span>
              <span className="app-alloc__name">{row.name}</span>
            </span>
            <Stepper
              value={row.percent}
              label={`${row.ticker} allocation`}
              canIncrease={row.canIncrease}
              canDecrease={row.canDecrease}
              onIncrease={() => onIncrease(row.assetId)}
              onDecrease={() => onDecrease(row.assetId)}
            />
          </li>
        ))}
      </ul>
      <p
        className={cn(
          'app-alloc__total',
          complete ? 'app-alloc__total--ok' : 'app-alloc__total--off'
        )}
      >
        {total}
      </p>
    </div>
  )
}
