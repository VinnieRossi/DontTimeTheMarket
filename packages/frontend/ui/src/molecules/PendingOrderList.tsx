import { cn } from '../lib/cn'

export interface PendingOrderView {
  id: number
  /** Already written out by the caller: this component formats nothing. */
  description: string
}

export interface PendingOrderListProps {
  orders: readonly PendingOrderView[]
  onCancel: (id: number) => void
  className?: string | undefined
}

/**
 * Orders that have not filled yet. It renders nothing when there are none, because a heading over
 * an empty list reads as a list that failed to load.
 */
export function PendingOrderList({ orders, onCancel, className }: PendingOrderListProps) {
  if (orders.length === 0) return null
  return (
    <div className={cn('app-sheet__group', className)}>
      <div className="app-sheet__group-title">Pending</div>
      {orders.map((order) => (
        <div key={order.id} className="app-order">
          <span>{order.description}</span>
          <button
            type="button"
            className={cn('app-order__cancel', 'app-focusable')}
            onClick={() => onCancel(order.id)}
          >
            Cancel
          </button>
        </div>
      ))}
    </div>
  )
}
