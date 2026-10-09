import { cn } from '../lib/cn'

export interface SwitchProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string | undefined
}

/**
 * One realism switch, with its label beside it. It is a button carrying the switch role rather
 * than a styled checkbox, because the knob and the track are drawn rather than native and a
 * checkbox underneath would report a state the drawing could disagree with.
 */
export function Switch({ label, checked, onChange, className }: SwitchProps) {
  return (
    <div className={cn('app-switch-row', className)}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        className={cn('app-switch', 'app-focusable')}
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span className="app-switch__knob" />
      </button>
    </div>
  )
}
