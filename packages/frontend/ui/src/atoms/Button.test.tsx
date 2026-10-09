import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its label and reports a click', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Start run</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Start run' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not report a click while disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Continue this run
      </Button>
    )

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is reachable and operable from the keyboard alone', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Start run</Button>)

    await userEvent.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('defaults to a plain button, so it cannot submit a form by accident', () => {
    render(<Button>Start run</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('submits when asked to', () => {
    render(<Button type="submit">Start run</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('carries the variant and size in its class names, which is where the tokens resolve', () => {
    render(
      <Button variant="sell" size="lg" fullWidth>
        Sell
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('app-button--sell')
    expect(button.className).toContain('app-button--lg')
    expect(button.className).toContain('app-button--full')
  })

  it('gets its name from the label when the only thing visible is a glyph', () => {
    render(
      <Button icon label="Realism settings">
        {'⚙'}
      </Button>
    )
    expect(screen.getByRole('button', { name: 'Realism settings' }).className).toContain(
      'app-button--icon'
    )
  })
})
