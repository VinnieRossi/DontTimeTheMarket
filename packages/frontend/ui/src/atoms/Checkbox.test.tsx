import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('is labeled and reports the state it was switched to', async () => {
    const onChange = vi.fn()
    render(<Checkbox id="rsi" label="RSI (14)" checked={false} onChange={onChange} />)

    const box = screen.getByRole('checkbox', { name: 'RSI (14)' })
    expect(box).not.toBeChecked()
    await userEvent.click(box)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('reports being switched off when it was on', async () => {
    const onChange = vi.fn()
    render(<Checkbox id="rsi" label="RSI (14)" checked onChange={onChange} />)

    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
