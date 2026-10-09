import {
  isTradeOrderType,
  parseTradeForm,
  type TradeIntent,
  type TradeOrderType,
  type TradeSide,
} from '@dttm/validation'
import { useState } from 'react'
import { Button } from '../atoms/Button'
import { NumberField } from '../atoms/NumberField'
import { SelectField, type SelectOption } from '../atoms/SelectField'
import { ToggleChip } from '../atoms/ToggleChip'
import { BottomSheet } from '../molecules/BottomSheet'
import { PendingOrderList, type PendingOrderView } from '../molecules/PendingOrderList'

const BUY_PRESETS = ['10', '25', '50', '100'] as const
const SELL_PRESETS = ['25', '50', '100'] as const

const BUY_ORDER_OPTIONS: readonly SelectOption[] = [
  { value: 'market', label: 'Market' },
  { value: 'limit', label: 'Limit (buy if price falls to...)' },
]

const SELL_ORDER_OPTIONS: readonly SelectOption[] = [
  { value: 'market', label: 'Market' },
  { value: 'stop', label: 'Stop-loss (sell if price falls to...)' },
  { value: 'takeProfit', label: 'Take-profit (sell if price rises to...)' },
]

interface SideForm {
  percent: string
  orderType: TradeOrderType
  triggerPrice: string
}

const INITIAL: Record<TradeSide, SideForm> = {
  buy: { percent: '25', orderType: 'market', triggerPrice: '' },
  sell: { percent: '100', orderType: 'market', triggerPrice: '' },
}

export interface TradeSheetProps {
  pending: readonly PendingOrderView[]
  onSubmit: (intent: TradeIntent) => void
  onCancelOrder: (id: number) => void
  onClose: () => void
}

/**
 * The trade sheet. It holds what is typed and nothing else: the numbers are parsed by the shared
 * schema and handed over as a trade, so a half-typed field cannot reach the simulation as a zero.
 *
 * Both sides keep their own fields, because switching to the sell tab to check a size and
 * switching back should not have quietly rewritten the buy.
 */
export function TradeSheet({ pending, onSubmit, onCancelOrder, onClose }: TradeSheetProps) {
  const [side, setSide] = useState<TradeSide>('buy')
  const [forms, setForms] = useState<Record<TradeSide, SideForm>>(INITIAL)
  const [error, setError] = useState<string | undefined>(undefined)

  const form = forms[side]
  const buying = side === 'buy'
  const presets = buying ? BUY_PRESETS : SELL_PRESETS

  function update(changes: Partial<SideForm>): void {
    setForms((current) => ({ ...current, [side]: { ...current[side], ...changes } }))
    setError(undefined)
  }

  function switchTo(next: TradeSide): void {
    setSide(next)
    setError(undefined)
  }

  function submit(): void {
    const parsed = parseTradeForm({
      side,
      orderType: form.orderType,
      percent: form.percent,
      triggerPrice: form.triggerPrice,
    })
    if (!parsed.ok) {
      setError(parsed.error.message)
      return
    }
    onSubmit(parsed.value)
    onClose()
  }

  return (
    <BottomSheet
      title="Trade"
      onClose={onClose}
      footer={
        <>
          {/*
           * The tabs above are also named Buy and Sell, so this one says what it does rather
           * than which side it is on: two controls with the same name read as the same control.
           */}
          <Button
            variant={buying ? 'buy' : 'sell'}
            fullWidth
            label={buying ? 'Place buy order' : 'Place sell order'}
            onClick={submit}
          >
            {buying ? 'Buy' : 'Sell'}
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="app-chip-row app-sheet__block">
        <ToggleChip size="md" selected={buying} onSelect={() => switchTo('buy')}>
          Buy
        </ToggleChip>
        <ToggleChip size="md" selected={!buying} onSelect={() => switchTo('sell')}>
          Sell
        </ToggleChip>
      </div>

      <p className="app-sheet__lede">
        {buying
          ? 'Spends a percentage of your free cash.'
          : 'Liquidates a percentage of your current position.'}
      </p>

      <div className="app-row app-row--tight app-sheet__block">
        {presets.map((preset) => (
          <ToggleChip
            key={preset}
            selected={form.percent === preset}
            onSelect={() => update({ percent: preset })}
          >
            {`${preset}%`}
          </ToggleChip>
        ))}
      </div>

      <div className="app-sheet__fields">
        <NumberField
          id="trade-percent"
          label={buying ? '% of cash' : '% of position'}
          value={form.percent}
          min={1}
          max={100}
          error={error}
          onChange={(percent) => update({ percent })}
        />
        <SelectField
          id="trade-order-type"
          label="Order type"
          value={form.orderType}
          options={buying ? BUY_ORDER_OPTIONS : SELL_ORDER_OPTIONS}
          onChange={(value) => {
            if (isTradeOrderType(value)) update({ orderType: value })
          }}
        />
        {form.orderType !== 'market' && (
          <NumberField
            id="trade-trigger-price"
            label={buying ? 'Limit price' : 'Trigger price'}
            value={form.triggerPrice}
            onChange={(triggerPrice) => update({ triggerPrice })}
          />
        )}
      </div>

      <PendingOrderList orders={pending} onCancel={onCancelOrder} />
    </BottomSheet>
  )
}
