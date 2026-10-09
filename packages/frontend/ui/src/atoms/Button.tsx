import type { Size } from '@dttm/theme'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'buy' | 'sell'

export interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: Size
  type?: 'button' | 'submit'
  /** Stretches to the width of its column, which is how every committing action reads here. */
  fullWidth?: boolean
  /** A round button whose label is a single glyph. */
  icon?: boolean
  disabled?: boolean
  /** An accessible name, for a button whose visible label is a glyph. */
  label?: string | undefined
  className?: string | undefined
  onClick?: (() => void) | undefined
}

/**
 * A button. It renders what it is given and reports a click; it never performs the action itself,
 * which is what lets the same button sit in a story, a test, and a screen.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  fullWidth = false,
  icon = false,
  disabled = false,
  label,
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
        fullWidth && 'app-button--full',
        icon && 'app-button--icon',
        className
      )}
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
