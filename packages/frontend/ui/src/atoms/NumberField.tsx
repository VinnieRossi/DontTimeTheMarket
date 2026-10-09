import { cn } from '../lib/cn'

export interface NumberFieldProps {
  id: string
  label: string
  /** Held as text rather than a number, so a half-typed value is not rounded while it is typed. */
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  placeholder?: string
  disabled?: boolean
  /** Shown beneath the field and announced, for a problem with this field specifically. */
  error?: string | undefined
  className?: string | undefined
}

/**
 * A labeled number field. The value stays a string on the way through: a number input that
 * parses on every keystroke turns an empty field into a zero and an in-progress decimal into
 * something the typist did not write.
 */
export function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled = false,
  error,
  className,
}: NumberFieldProps) {
  const errorId = `${id}-error`
  return (
    <div className={cn('app-field', className)}>
      <label className="app-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className={cn('app-input', 'app-focusable')}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error !== undefined || undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error !== undefined && (
        <p className="app-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
