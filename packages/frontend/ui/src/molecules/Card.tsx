import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface CardProps {
  children: ReactNode
  /** A roomy card is the one a whole screen sits in; the default holds a section of one. */
  roomy?: boolean
  className?: string | undefined
}

/** The white panel everything on a screen sits on. */
export function Card({ children, roomy = false, className }: CardProps) {
  return <div className={cn('app-card', roomy && 'app-card--roomy', className)}>{children}</div>
}
