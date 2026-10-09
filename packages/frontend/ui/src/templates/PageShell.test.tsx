import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageShell } from './PageShell'

describe('PageShell', () => {
  it('renders the title as the page heading, and the content inside the main region', () => {
    render(
      <PageShell title="Notes">
        <p>Content</p>
      </PageShell>
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Content')
  })

  it('shows a description when there is one', () => {
    render(
      <PageShell title="Notes" description="Everything written down so far.">
        <p>Content</p>
      </PageShell>
    )
    expect(screen.getByText('Everything written down so far.')).toBeInTheDocument()
  })

  it('renders no description element when there is none', () => {
    const { container } = render(
      <PageShell title="Notes">
        <p>Content</p>
      </PageShell>
    )
    expect(container.querySelector('.app-page__description')).toBeNull()
  })

  it('renders the primary action beside the title', () => {
    render(
      <PageShell title="Notes" actions={<button type="button">New note</button>}>
        <p>Content</p>
      </PageShell>
    )
    expect(screen.getByRole('button', { name: 'New note' })).toBeInTheDocument()
  })
})
