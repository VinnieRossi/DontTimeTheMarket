import { cn } from '../lib/cn'

export interface CheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string | undefined
}

/** A labeled checkbox, for one readout in the pile a player can switch on. */
export function Checkbox({ id, label, checked, onChange, className }: CheckboxProps) {
  return (
    <label className={cn('app-check', className)} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={cn('app-check__box', 'app-focusable')}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  )
}
