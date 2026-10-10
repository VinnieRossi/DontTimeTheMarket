import type { ChartPointView } from '../domain/chart-view'
import { cn } from '../lib/cn'

export interface SparklineProps {
  points: readonly ChartPointView[]
  /** What the line is of, for a reader who cannot see it. */
  label: string
  /** Colors the line by whether it ended above or below where it started. */
  tone?: 'auto' | 'neutral'
  className?: string | undefined
}

const WIDTH = 100
const HEIGHT = 28

function pathFor(points: readonly ChartPointView[]): string {
  if (points.length < 2) return ''
  const values = points.map((point) => point.value)
  const lowest = Math.min(...values)
  const highest = Math.max(...values)
  const span = highest - lowest || 1

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * WIDTH
      const y = HEIGHT - ((point.value - lowest) / span) * HEIGHT
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

/**
 * A line with no axes, no labels, and no numbers: the shape of a series and nothing else.
 *
 * It is drawn as inline SVG rather than on a canvas because there is one of these per row and a
 * canvas apiece would mean a context apiece. The shape is all it says on purpose, since the
 * figures behind a company's trends would often identify it outright.
 */
export function Sparkline({ points, label, tone = 'auto', className }: SparklineProps) {
  const path = pathFor(points)
  if (path === '') return null

  const first = points[0]?.value ?? 0
  const last = points[points.length - 1]?.value ?? 0
  const direction = tone === 'neutral' ? 'flat' : last >= first ? 'up' : 'down'

  return (
    <svg
      className={cn('app-spark', `app-spark--${direction}`, className)}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <path d={path} fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
