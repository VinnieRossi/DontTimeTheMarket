import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Stepper } from './Stepper'

describe('Stepper', () => {
  it('shows the figure it was handed and formats nothing itself', () => {
    render(
      <Stepper value="35%" label="NTHX allocation" onIncrease={vi.fn()} onDecrease={vi.fn()} />
    )
    expect(screen.getByText('35%')).toBeVisible()
  })

  it('names both buttons after what they change, so each one stands on its own', () => {
    render(
      <Stepper value="35%" label="NTHX allocation" onIncrease={vi.fn()} onDecrease={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Increase NTHX allocation' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Decrease NTHX allocation' })).toBeVisible()
  })

  it('reports which way it was stepped rather than holding the figure', async () => {
    const onIncrease = vi.fn()
    const onDecrease = vi.fn()
    render(<Stepper value="35%" label="Weight" onIncrease={onIncrease} onDecrease={onDecrease} />)

    await userEvent.click(screen.getByRole('button', { name: 'Increase Weight' }))
    await userEvent.click(screen.getByRole('button', { name: 'Decrease Weight' }))
    expect(onIncrease).toHaveBeenCalledTimes(1)
    expect(onDecrease).toHaveBeenCalledTimes(1)
  })

  it('cannot be stepped past an end its owner has closed off', () => {
    render(
      <Stepper
        value="100%"
        label="Weight"
        canIncrease={false}
        onIncrease={vi.fn()}
        onDecrease={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Increase Weight' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease Weight' })).toBeEnabled()
  })
})
