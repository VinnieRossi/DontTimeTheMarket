import type { Tone } from '@dttm/theme'
import { cn } from '../lib/cn'

export interface StatusBadgeProps {
  children: string
  tone?: Tone
  className?: string | undefined
}

/**
 * A short status label. It takes a tone rather than a color, so what "danger" looks like is a
 * decision held in the token file and not in this component.
 */
export function StatusBadge({ children, tone = 'neutral', className }: StatusBadgeProps) {
  return <span className={cn('app-badge', `app-badge--${tone}`, className)}>{children}</span>
}
