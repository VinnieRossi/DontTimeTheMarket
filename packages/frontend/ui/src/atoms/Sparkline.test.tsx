import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sparkline } from './Sparkline'

const rising = [
  { day: 0, value: 100 },
  { day: 1, value: 110 },
  { day: 2, value: 130 },
]
const falling = [...rising].reverse().map((point, index) => ({ day: index, value: point.value }))

describe('Sparkline', () => {
  it('names what the line is of, for a reader who cannot see it', () => {
    render(<Sparkline points={rising} label="NTHX price line" />)
    expect(screen.getByRole('img', { name: 'NTHX price line' })).toBeVisible()
  })

  it('colors a line that ended up as up, and one that ended down as down', () => {
    const { container: up } = render(<Sparkline points={rising} label="Up" />)
    expect(up.querySelector('.app-spark--up')).not.toBeNull()

    const { container: down } = render(<Sparkline points={falling} label="Down" />)
    expect(down.querySelector('.app-spark--down')).not.toBeNull()
  })

  it('stays neutral where the direction is not the point', () => {
    const { container } = render(<Sparkline points={rising} label="Revenue" tone="neutral" />)
    expect(container.querySelector('.app-spark--flat')).not.toBeNull()
  })

  it('draws a path that visits every point it was given', () => {
    const { container } = render(<Sparkline points={rising} label="Line" />)
    const commands = container.querySelector('path')?.getAttribute('d')?.split('L') ?? []
    expect(commands).toHaveLength(rising.length)
  })

  it('draws nothing at all rather than a dot for a series with one reading', () => {
    const { container } = render(<Sparkline points={[{ day: 0, value: 100 }]} label="One" />)
    expect(container.firstElementChild).toBeNull()
  })

  it('draws a flat series without dividing by a span of zero', () => {
    const flat = [
      { day: 0, value: 100 },
      { day: 1, value: 100 },
    ]
    const { container } = render(<Sparkline points={flat} label="Flat" />)
    expect(container.querySelector('path')?.getAttribute('d')).not.toContain('NaN')
  })
})
