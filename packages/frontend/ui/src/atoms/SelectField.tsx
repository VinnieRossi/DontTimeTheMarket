import { cn } from '../lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  className?: string | undefined
}

/**
 * A labeled select. The options arrive as data rather than as children, so a caller cannot build
 * a list the value can never match.
 */
export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  className,
}: SelectFieldProps) {
  return (
    <div className={cn('app-field', className)}>
      <label className="app-field__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={cn('app-input', 'app-focusable')}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
