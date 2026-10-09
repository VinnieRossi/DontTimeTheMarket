import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders its label', () => {
    render(<StatusBadge>Full Terminal Mode</StatusBadge>)
    expect(screen.getByText('Full Terminal Mode')).toBeVisible()
  })

  it('defaults to the neutral tone, so a caller gets a readable badge without choosing one', () => {
    render(<StatusBadge>Clean</StatusBadge>)
    expect(screen.getByText('Clean').className).toContain('app-badge--neutral')
  })

  it('carries the tone it was given in its class names, which is where the token resolves', () => {
    render(<StatusBadge tone="danger">Overkill</StatusBadge>)
    expect(screen.getByText('Overkill').className).toContain('app-badge--danger')
  })
})
