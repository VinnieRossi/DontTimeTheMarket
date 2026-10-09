import { cn } from '../lib/cn'

export interface ReadoutItem {
  key: string
  label: string
  value: string
}

export interface ReadoutListProps {
  items: readonly ReadoutItem[]
  className?: string | undefined
}

/**
 * The row of small readouts a player has switched on. It renders nothing at all when the list is
 * empty, rather than an empty strip holding space open for data nobody asked for.
 */
export function ReadoutList({ items, className }: ReadoutListProps) {
  if (items.length === 0) return null
  return (
    <div className={cn('app-row', 'app-row--tight', className)}>
      {items.map((item) => (
        <span key={item.key} className="app-readout">
          {item.label}
          <b className="app-readout__value">{item.value}</b>
        </span>
      ))}
    </div>
  )
}
