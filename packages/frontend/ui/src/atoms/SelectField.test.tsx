import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectField } from './SelectField'

const OPTIONS = [
  { value: 'market', label: 'Market' },
  { value: 'limit', label: 'Limit' },
]

describe('SelectField', () => {
  it('renders every option it was given, labeled', () => {
    render(
      <SelectField
        id="order-type"
        label="Order type"
        value="market"
        options={OPTIONS}
        onChange={() => undefined}
      />
    )
    expect(screen.getByLabelText('Order type')).toHaveValue('market')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Market',
      'Limit',
    ])
  })

  it('reports the chosen value', async () => {
    const onChange = vi.fn()
    render(
      <SelectField
        id="order-type"
        label="Order type"
        value="market"
        options={OPTIONS}
        onChange={onChange}
      />
    )

    await userEvent.selectOptions(screen.getByLabelText('Order type'), 'limit')
    expect(onChange).toHaveBeenCalledWith('limit')
  })

  it('takes no input while disabled', () => {
    render(
      <SelectField
        id="order-type"
        label="Order type"
        value="market"
        options={OPTIONS}
        disabled
        onChange={() => undefined}
      />
    )
    expect(screen.getByLabelText('Order type')).toBeDisabled()
  })
})
