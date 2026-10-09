import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface PageShellProps {
  title: string
  description?: string
  /** Rendered beside the title: the page's primary action, when it has one. */
  actions?: ReactNode
  children: ReactNode
  className?: string | undefined
}

/**
 * The page frame: a heading, an optional description, room for a primary action, and the content.
 * Every page uses it, so heading levels and spacing are decided once rather than per page.
 */
export function PageShell({ title, description, actions, children, className }: PageShellProps) {
  return (
    <main className={cn('app-page', className)}>
      <header className="app-page__header">
        <div>
          <h1 className="app-page__title">{title}</h1>
          {description !== undefined && <p className="app-page__description">{description}</p>}
        </div>
        {actions !== undefined && <div className="app-row">{actions}</div>}
      </header>
      {children}
    </main>
  )
}
