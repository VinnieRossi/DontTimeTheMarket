import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its label and reports a click', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save note</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not report a click while disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save note
      </Button>
    )

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('cannot be pressed twice while the action is in flight', async () => {
    const onClick = vi.fn()
    render(
      <Button busy onClick={onClick}>
        Saving
      </Button>
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is reachable and operable from the keyboard alone', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save note</Button>)

    await userEvent.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('defaults to a plain button, so it cannot submit a form by accident', () => {
    render(<Button>Save note</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('submits when asked to', () => {
    render(<Button type="submit">Save note</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('carries the variant and size in its class names, which is where the tokens resolve', () => {
    render(
      <Button variant="danger" size="lg">
        Delete note
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('app-button--danger')
    expect(button.className).toContain('app-button--lg')
  })
})
