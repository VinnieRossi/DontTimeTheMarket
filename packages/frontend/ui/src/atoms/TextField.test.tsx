import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TextField } from './TextField'

describe('TextField', () => {
  it('associates its label with its input, so clicking the label focuses the field', async () => {
    render(<TextField id="title" label="Title" value="" onChange={vi.fn()} />)

    await userEvent.click(screen.getByText('Title'))
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('reports what was typed, one change at a time', async () => {
    const onChange = vi.fn()
    render(<TextField id="title" label="Title" value="" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Title'), 'ab')
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith('b')
  })

  it('renders a single-line field by default and a multiline one when given rows', () => {
    const { unmount } = render(<TextField id="a" label="A" value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('A').tagName).toBe('INPUT')
    unmount()

    render(<TextField id="b" label="B" value="" onChange={vi.fn()} rows={3} />)
    expect(screen.getByLabelText('B').tagName).toBe('TEXTAREA')
  })

  it('marks itself invalid and points at its message when there is an error', () => {
    render(
      <TextField id="title" label="Title" value="" onChange={vi.fn()} error="A title is required" />
    )

    const field = screen.getByLabelText('Title')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('A title is required')
  })

  it('is not marked invalid when there is no error', () => {
    render(<TextField id="title" label="Title" value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Title')).not.toHaveAttribute('aria-invalid')
  })

  it('cannot be typed into while disabled', async () => {
    const onChange = vi.fn()
    render(<TextField id="title" label="Title" value="" onChange={onChange} disabled />)

    await userEvent.type(screen.getByLabelText('Title'), 'x')
    expect(onChange).not.toHaveBeenCalled()
  })
})
