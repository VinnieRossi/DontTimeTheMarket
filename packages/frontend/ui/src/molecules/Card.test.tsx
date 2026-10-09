import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders what it was given on the card surface', () => {
    const { container } = render(
      <Card>
        <p>Inside</p>
      </Card>
    )
    expect(screen.getByText('Inside')).toBeVisible()
    expect(container.firstElementChild?.className).toContain('app-card')
  })

  it('can take the roomier padding a whole screen sits in', () => {
    const { container } = render(<Card roomy>Inside</Card>)
    expect(container.firstElementChild?.className).toContain('app-card--roomy')
  })
})
