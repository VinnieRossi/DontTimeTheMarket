import type { Size } from '@dttm/theme'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: Size
  type?: 'button' | 'submit'
  disabled?: boolean
  /** Set while the action is in flight, which both disables the control and says why. */
  busy?: boolean
  className?: string | undefined
  onClick?: (() => void) | undefined
}

/**
 * A button. It renders what it is given and reports a click; it never performs the action itself,
 * which is what lets the same button sit in a story, a test, and a page.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  busy = false,
  className,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'app-button',
        'app-focusable',
        `app-button--${variant}`,
        `app-button--${size}`,
        className
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
