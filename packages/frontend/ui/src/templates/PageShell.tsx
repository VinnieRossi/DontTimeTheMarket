import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface PageShellProps {
  /** The name in the corner. It is the only chrome the game has. */
  brand: string
  children: ReactNode
  /** A narrow body, for the single-card screens that open and close a run. */
  narrow?: boolean
  className?: string | undefined
}

/**
 * The page frame: the name in the corner and a centered column under it. Every screen uses it, so
 * the column width and the gutter are decided once rather than per screen.
 */
export function PageShell({ brand, children, narrow = false, className }: PageShellProps) {
  return (
    <div className={cn('app-page', className)}>
      <header className="app-page__header">
        <span className="app-page__brand">{brand}</span>
      </header>
      <main className={cn('app-page__body', narrow && 'app-page__body--narrow')}>{children}</main>
    </div>
  )
}
