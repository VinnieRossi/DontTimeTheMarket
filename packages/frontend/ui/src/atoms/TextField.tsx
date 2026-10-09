import { cn } from '../lib/cn'

export interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  /** Rendered as a textarea when set, which is the only difference between the two. */
  rows?: number
  placeholder?: string
  disabled?: boolean
  /** Shown beneath the field and announced, for a problem with this field specifically. */
  error?: string | undefined
  className?: string | undefined
}

/**
 * A labeled text field. It exists so a form is composed rather than hand-written: an input written
 * inline in a page carries no token styling, no label association, and no error slot, and the next
 * page writes it slightly differently.
 */
export function TextField({
  id,
  label,
  value,
  onChange,
  rows,
  placeholder,
  disabled = false,
  error,
  className,
}: TextFieldProps) {
  const errorId = `${id}-error`
  const shared = {
    id,
    value,
    placeholder,
    disabled,
    className: cn('app-input', 'app-focusable'),
    'aria-invalid': error !== undefined || undefined,
    'aria-describedby': error !== undefined ? errorId : undefined,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  }

  return (
    <div className={cn('app-field', className)}>
      <label className="app-field__label" htmlFor={id}>
        {label}
      </label>
      {rows === undefined ? (
        <input type="text" {...shared} />
      ) : (
        <textarea rows={rows} {...shared} />
      )}
      {error !== undefined && (
        <p className="app-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
