import { TONES } from '@dttm/theme'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders its label', () => {
    render(<StatusBadge>draft</StatusBadge>)
    expect(screen.getByText('draft')).toBeInTheDocument()
  })

  it('defaults to the neutral tone', () => {
    render(<StatusBadge>draft</StatusBadge>)
    expect(screen.getByText('draft').className).toContain('app-badge--neutral')
  })

  it('has a class for every tone the theme names, so none resolves to nothing', () => {
    for (const tone of TONES) {
      const { unmount } = render(<StatusBadge tone={tone}>{tone}</StatusBadge>)
      expect(screen.getByText(tone).className).toContain(`app-badge--${tone}`)
      unmount()
    }
  })
})
