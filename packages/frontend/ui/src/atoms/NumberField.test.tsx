import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NumberField } from './NumberField'

describe('NumberField', () => {
  it('labels its input, so the field has a name without a placeholder standing in for one', () => {
    render(<NumberField id="percent" label="% of cash" value="25" onChange={() => undefined} />)
    expect(screen.getByLabelText('% of cash')).toHaveValue(25)
  })

  it('reports what was typed as text, without rounding a half-typed number', async () => {
    const onChange = vi.fn()
    render(<NumberField id="percent" label="% of cash" value="" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('% of cash'), '7')
    expect(onChange).toHaveBeenLastCalledWith('7')
  })

  it('announces an error against the field it belongs to', () => {
    render(
      <NumberField
        id="percent"
        label="% of cash"
        value="0"
        error="A trade has to be at least 1 percent"
        onChange={() => undefined}
      />
    )
    const input = screen.getByLabelText('% of cash')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('A trade has to be at least 1 percent')
  })

  it('takes no input while disabled', () => {
    render(
      <NumberField id="percent" label="% of cash" value="25" disabled onChange={() => undefined} />
    )
    expect(screen.getByLabelText('% of cash')).toBeDisabled()
  })
})
