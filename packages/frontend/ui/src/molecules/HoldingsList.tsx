import { Sparkline } from '../atoms/Sparkline'
import type { HoldingRowView } from '../domain/portfolio-view'
import { cn } from '../lib/cn'

export interface HoldingsListProps {
  holdings: readonly HoldingRowView[]
  /** What to say when every position has been sold and the portfolio is all cash. */
  emptyNote: string
  className?: string | undefined
  /** Opens the trade panel on one holding, which is how a position is added to or trimmed. */
  onTradeHolding: (assetId: string) => void
}

/**
 * What the portfolio holds, one tappable row apiece.
 *
 * Each row carries the holding's own price line, because the chart above it plots the portfolio as
 * a whole and a player trimming one position needs to see what that position has been doing.
 */
export function HoldingsList({
  holdings,
  emptyNote,
  className,
  onTradeHolding,
}: HoldingsListProps) {
  if (holdings.length === 0) {
    return <p className={cn('app-text-muted', className)}>{emptyNote}</p>
  }

  return (
    <ul className={cn('app-holdings', className)}>
      {holdings.map((holding) => (
        <li key={holding.assetId}>
          <button
            type="button"
            className="app-holding app-focusable"
            onClick={() => onTradeHolding(holding.assetId)}
          >
            <span className="app-holding__who">
              <span className="app-holding__ticker">{holding.ticker}</span>
              <span className="app-holding__name">{holding.name}</span>
              <span className="app-holding__detail">{holding.detail}</span>
            </span>
            <Sparkline points={holding.spark} label={`${holding.ticker} price line`} />
            <span className="app-holding__figures">
              <span className="app-holding__value">{holding.value}</span>
              <span className="app-holding__weight">{holding.weight}</span>
              <span
                className={cn(
                  'app-holding__drift',
                  holding.direction === 'up' ? 'app-text-up' : 'app-text-down'
                )}
              >
                {holding.drift}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
