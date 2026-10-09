import type { ChartSeriesRole } from '../domain/chart-view'
import { cn } from '../lib/cn'

export interface ChartLegendItem {
  role: ChartSeriesRole
  label: string
}

export interface ChartLegendProps {
  items: readonly ChartLegendItem[]
  className?: string | undefined
}

/**
 * The key under the chart. Each swatch is drawn by the same token the line it describes is drawn
 * with, so a color change moves both at once rather than leaving the key describing the old chart.
 */
export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={cn('app-legend', className)}>
      {items.map((item) => (
        <span key={item.role} className="app-legend__item">
          <i
            className={cn(
              'app-legend__swatch',
              `app-legend__swatch--${item.role}`,
              (item.role === 'benchmark' ||
                item.role === 'bollingerUpper' ||
                item.role === 'bollingerLower') &&
                'app-legend__swatch--dashed'
            )}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}
