import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TradeSheet } from './TradeSheet'

function renderSheet(pending: { id: number; description: string }[] = []) {
  const onSubmit = vi.fn()
  const onCancelOrder = vi.fn()
  const onClose = vi.fn()
  render(
    <TradeSheet
      pending={pending}
      onSubmit={onSubmit}
      onCancelOrder={onCancelOrder}
      onClose={onClose}
    />
  )
  return { onSubmit, onCancelOrder, onClose }
}

describe('TradeSheet', () => {
  it('opens on the buy side, sized at a quarter of the cash', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: 'Buy', pressed: true })).toBeVisible()
    expect(screen.getByLabelText('% of cash')).toHaveValue(25)
  })

  it('hands over a parsed market buy and closes', async () => {
    const { onSubmit, onClose } = renderSheet()

    await userEvent.click(screen.getByRole('button', { name: 'Place buy order' }))
    expect(onSubmit).toHaveBeenCalledWith({ side: 'buy', orderType: 'market', percent: 25 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('sizes from a preset', async () => {
    const { onSubmit } = renderSheet()

    await userEvent.click(screen.getByRole('button', { name: '50%' }))
    await userEvent.click(screen.getByRole('button', { name: 'Place buy order' }))
    expect(onSubmit).toHaveBeenCalledWith({ side: 'buy', orderType: 'market', percent: 50 })
  })

  it("keeps each side's own fields, so checking the other tab rewrites nothing", async () => {
    renderSheet()

    await userEvent.clear(screen.getByLabelText('% of cash'))
    await userEvent.type(screen.getByLabelText('% of cash'), '40')
    await userEvent.click(screen.getByRole('button', { name: 'Sell' }))
    expect(screen.getByLabelText('% of position')).toHaveValue(100)

    await userEvent.click(screen.getByRole('button', { name: 'Buy', pressed: false }))
    expect(screen.getByLabelText('% of cash')).toHaveValue(40)
  })

  it('refuses a size the rules do not allow, and says which rule', async () => {
    const { onSubmit, onClose } = renderSheet()

    await userEvent.clear(screen.getByLabelText('% of cash'))
    await userEvent.click(screen.getByRole('button', { name: 'Place buy order' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText('% of cash')).toHaveAccessibleDescription(/at least 1 percent/)
  })

  it('asks for a trigger price once the order type waits for one', async () => {
    const { onSubmit } = renderSheet()

    await userEvent.selectOptions(screen.getByLabelText('Order type'), 'limit')
    await userEvent.click(screen.getByRole('button', { name: 'Place buy order' }))
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Limit price'), '94.2')
    await userEvent.click(screen.getByRole('button', { name: 'Place buy order' }))
    expect(onSubmit).toHaveBeenCalledWith({
      side: 'buy',
      orderType: 'limit',
      percent: 25,
      triggerPrice: 94.2,
    })
  })

  it('offers the sell side its own order types and sells the whole position by default', async () => {
    const { onSubmit } = renderSheet()

    await userEvent.click(screen.getByRole('button', { name: 'Sell' }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Market',
      'Stop-loss (sell if price falls to...)',
      'Take-profit (sell if price rises to...)',
    ])

    await userEvent.click(screen.getByRole('button', { name: 'Place sell order' }))
    expect(onSubmit).toHaveBeenCalledWith({ side: 'sell', orderType: 'market', percent: 100 })
  })

  it('lists the orders still waiting and reports a cancellation', async () => {
    const { onCancelOrder } = renderSheet([{ id: 3, description: 'buy limit at 94.20' }])

    expect(screen.getByText('buy limit at 94.20')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancelOrder).toHaveBeenCalledWith(3)
  })

  it('names which company the panel is pointed at, when a run holds several', () => {
    render(
      <TradeSheet
        pending={[]}
        subject="NTHX"
        marketOnly
        onSubmit={vi.fn()}
        onCancelOrder={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('heading', { name: 'Trade NTHX' })).toBeVisible()
  })

  it('offers market orders only where a basket would make the rest too much interface', () => {
    render(
      <TradeSheet
        pending={[]}
        subject="NTHX"
        marketOnly
        onSubmit={vi.fn()}
        onCancelOrder={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByLabelText('Order type')).toBeNull()
  })

  it('still hands over a market order from the sell side of a market-only panel', async () => {
    const onSubmit = vi.fn()
    render(
      <TradeSheet
        pending={[]}
        subject="NTHX"
        marketOnly
        onSubmit={onSubmit}
        onCancelOrder={vi.fn()}
        onClose={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sell', pressed: false }))
    await userEvent.click(screen.getByRole('button', { name: 'Place sell order' }))
    expect(onSubmit).toHaveBeenCalledWith({ side: 'sell', orderType: 'market', percent: 100 })
  })
})
