import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BottomSheet } from './BottomSheet'

function renderSheet(onClose = vi.fn()) {
  render(
    <BottomSheet title="Trade" footer={<button type="button">Confirm</button>} onClose={onClose}>
      <p>Body</p>
    </BottomSheet>
  )
  return onClose
}

describe('BottomSheet', () => {
  it('is a dialog named by its own title', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Trade' })).toBeVisible()
  })

  it('renders the body and the pinned footer', () => {
    renderSheet()
    expect(screen.getByText('Body')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeVisible()
  })

  it('closes on a tap outside it', async () => {
    const onClose = renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss this sheet' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape, so a keyboard is never trapped in it', async () => {
    const onClose = renderSheet()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows a lede and a badge when it has them to show', () => {
    render(
      <BottomSheet
        title="Add data"
        lede="Pile these on."
        badge={<span>Overkill</span>}
        footer={<button type="button">Close</button>}
        onClose={() => undefined}
      >
        <p>Body</p>
      </BottomSheet>
    )
    expect(screen.getByText('Pile these on.')).toBeVisible()
    expect(screen.getByText('Overkill')).toBeVisible()
  })
})
