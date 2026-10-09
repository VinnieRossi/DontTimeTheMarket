import { type ReactNode, useEffect, useId } from 'react'
import { cn } from '../lib/cn'

export interface BottomSheetProps {
  title: string
  children: ReactNode
  /** The committing actions, pinned below the scrolling area where a thumb can reach them. */
  footer: ReactNode
  /** Rendered beside the title, for a sheet that has something to say about its own state. */
  badge?: ReactNode
  lede?: string
  className?: string | undefined
  onClose: () => void
}

/**
 * The panel every sheet opens in: a handle, a scrolling body, and a pinned footer. It rises from
 * the bottom edge because that is where a thumb already is, and it closes on Escape and on a tap
 * outside it, so a player is never trapped in one.
 */
export function BottomSheet({
  title,
  children,
  footer,
  badge,
  lede,
  className,
  onClose,
}: BottomSheetProps) {
  const titleId = useId()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className={cn('app-sheet', className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="app-sheet__scrim"
        aria-label="Dismiss this sheet"
        onClick={onClose}
      />
      <div className="app-sheet__panel">
        <div className="app-sheet__scroll">
          <div className="app-sheet__handle" />
          <div className="app-sheet__header">
            <h2 className="app-heading app-heading--sm" id={titleId}>
              {title}
            </h2>
            {badge}
          </div>
          {lede !== undefined && <p className="app-sheet__lede">{lede}</p>}
          {children}
        </div>
        <div className="app-sheet__footer">{footer}</div>
      </div>
    </div>
  )
}
