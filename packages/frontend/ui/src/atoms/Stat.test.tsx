import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Stat } from './Stat'

describe('Stat', () => {
  it('renders the label and the figure it was handed, formatting neither', () => {
    render(<Stat label="Cash" value="$3,480" />)
    expect(screen.getByText('Cash')).toBeVisible()
    expect(screen.getByText('$3,480')).toBeVisible()
  })

  it('colors the figure only where it means a direction', () => {
    const { container } = render(<Stat label="Vs Bogle NPC" value="+2.4%" direction="up" />)
    expect(container.querySelector('.app-text-up')).not.toBeNull()
    expect(container.querySelector('.app-text-down')).toBeNull()
  })

  it('colors a figure that went down', () => {
    const { container } = render(<Stat label="Vs Bogle NPC" value="-6.1%" direction="down" />)
    expect(container.querySelector('.app-text-down')).not.toBeNull()
  })

  it('sits on whichever surface it was asked for', () => {
    const { container: tile } = render(<Stat surface="tile" label="Cash" value="$1" />)
    expect(tile.firstElementChild?.className).toContain('app-tile')

    const { container: sunken } = render(<Stat surface="sunken" label="Cash" value="$1" />)
    expect(sunken.firstElementChild?.className).toContain('app-tile--sunken')

    const { container: bare } = render(<Stat label="Cash" value="$1" />)
    expect(bare.firstElementChild?.className).not.toContain('app-tile')
  })

  it('can read right-aligned, for the figure on the right of a pair', () => {
    const { container } = render(<Stat align="end" label="Bogle NPC" value="$10,980" />)
    expect(container.firstElementChild?.className).toContain('app-stat--end')
  })
})
