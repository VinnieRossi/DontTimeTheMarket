import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

describe('Switch', () => {
  it('reports its state as a switch rather than as a color', () => {
    render(<Switch label="Capital gains tax" checked onChange={() => undefined} />)
    expect(screen.getByRole('switch', { name: 'Capital gains tax' })).toBeChecked()
  })

  it('reports the state it would be switched to', async () => {
    const onChange = vi.fn()
    render(<Switch label="Capital gains tax" checked onChange={onChange} />)

    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('switches on from off', async () => {
    const onChange = vi.fn()
    render(<Switch label="Capital gains tax" checked={false} onChange={onChange} />)

    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
