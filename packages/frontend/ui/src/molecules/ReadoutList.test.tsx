import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReadoutList } from './ReadoutList'

describe('ReadoutList', () => {
  it('renders a readout per item, label and value', () => {
    render(<ReadoutList items={[{ key: 'rsi', label: 'RSI (14)', value: '61.4' }]} />)
    expect(screen.getByText('RSI (14)')).toBeVisible()
    expect(screen.getByText('61.4')).toBeVisible()
  })

  it('renders nothing at all when there is nothing switched on', () => {
    const { container } = render(<ReadoutList items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
