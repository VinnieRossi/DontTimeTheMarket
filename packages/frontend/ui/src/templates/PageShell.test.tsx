import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageShell } from './PageShell'

describe('PageShell', () => {
  it('shows the name in the corner and the screen under it', () => {
    render(
      <PageShell brand="Don't Time The Market">
        <p>Screen</p>
      </PageShell>
    )
    expect(screen.getByText("Don't Time The Market")).toBeVisible()
    expect(screen.getByRole('main')).toContainElement(screen.getByText('Screen'))
  })

  it('can run a narrower column, for the screens that open and close a run', () => {
    render(
      <PageShell brand="Don't Time The Market" narrow>
        <p>Screen</p>
      </PageShell>
    )
    expect(screen.getByRole('main').className).toContain('app-page__body--narrow')
  })
})
