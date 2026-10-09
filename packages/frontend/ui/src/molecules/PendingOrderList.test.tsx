import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PendingOrderList } from './PendingOrderList'

describe('PendingOrderList', () => {
  it('lists the orders that have not filled yet', () => {
    render(
      <PendingOrderList
        orders={[{ id: 7, description: 'buy limit at 94.20' }]}
        onCancel={() => undefined}
      />
    )
    expect(screen.getByText('buy limit at 94.20')).toBeVisible()
  })

  it('reports which order was canceled', async () => {
    const onCancel = vi.fn()
    render(<PendingOrderList orders={[{ id: 7, description: 'buy market' }]} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledWith(7)
  })

  it('renders nothing when nothing is waiting, rather than an empty heading', () => {
    const { container } = render(<PendingOrderList orders={[]} onCancel={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
