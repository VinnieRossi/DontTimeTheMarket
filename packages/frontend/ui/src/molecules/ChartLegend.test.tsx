import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartLegend } from './ChartLegend'

describe('ChartLegend', () => {
  it('names every line it was given', () => {
    render(
      <ChartLegend
        items={[
          { role: 'price', label: 'Market price' },
          { role: 'player', label: 'Your value' },
        ]}
      />
    )
    expect(screen.getByText('Market price')).toBeVisible()
    expect(screen.getByText('Your value')).toBeVisible()
  })

  it('draws each swatch from the token of the line it describes', () => {
    const { container } = render(<ChartLegend items={[{ role: 'sma20', label: 'SMA 20' }]} />)
    expect(container.querySelector('.app-legend__swatch--sma20')).not.toBeNull()
  })

  it('dashes the swatch of every line the chart draws dashed', () => {
    const { container } = render(
      <ChartLegend
        items={[
          { role: 'benchmark', label: 'Bogle NPC' },
          { role: 'bollingerUpper', label: 'Bollinger Bands' },
          { role: 'bollingerLower', label: 'Bollinger Bands' },
          { role: 'price', label: 'Market price' },
        ]}
      />
    )
    expect(container.querySelectorAll('.app-legend__swatch--dashed')).toHaveLength(3)
  })
})
