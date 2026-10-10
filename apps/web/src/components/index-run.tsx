'use client'

import { buyAmountForPercent, type GameState, sellQtyForPercent } from '@dttm/engine'
import type { UseGameResult } from '@dttm/hooks'
import {
  AddDataSheet,
  EndScreen,
  GameScreen,
  MarketChart,
  PageShell,
  SettingsSheet,
  TradeSheet,
} from '@dttm/ui'
import type { TradeIntent } from '@dttm/validation'
import { useState } from 'react'
import {
  BRAND,
  benchmarkFigure,
  cashOutAction,
  chartView,
  commentaryFor,
  complexityFor,
  dayLabel,
  endScreenView,
  indicatorTiers,
  legendFor,
  pendingOrders,
  playerFigure,
  readoutsFor,
  realismSwitches,
  SPEED_CHOICES,
  tilesFor,
  toIndicatorKey,
  toSettingKey,
} from '@/lib/game-view'

type OpenSheet = 'trade' | 'data' | 'settings' | null

export interface IndexRunProps {
  state: GameState
  dispatch: UseGameResult['dispatch']
  onPlayAgain: () => void
}

/**
 * An index run, composed. It maps what the engine holds into what the screens take and turns a
 * callback back into an action. It holds no rule of the game and no markup beyond choosing which
 * screen is on.
 */
export function IndexRun({ state, dispatch, onPlayAgain }: IndexRunProps) {
  const [sheet, setSheet] = useState<OpenSheet>(null)

  if (state.phase === 'ended') {
    return (
      <PageShell brand={BRAND} narrow>
        <EndScreen
          {...endScreenView(state)}
          onContinue={() => dispatch({ type: 'CONTINUE' })}
          onPlayAgain={onPlayAgain}
        />
      </PageShell>
    )
  }

  const { series, markers } = chartView(state)
  const placeOrder = (intent: TradeIntent): void => {
    dispatch({
      type: 'PLACE_ORDER',
      order:
        intent.side === 'buy'
          ? {
              side: 'buy',
              orderType: intent.orderType,
              amountUsd: buyAmountForPercent(state, intent.percent),
              ...(intent.triggerPrice === undefined ? {} : { targetPrice: intent.triggerPrice }),
            }
          : {
              side: 'sell',
              orderType: intent.orderType,
              qty: sellQtyForPercent(state, intent.percent),
              ...(intent.triggerPrice === undefined ? {} : { targetPrice: intent.triggerPrice }),
            },
    })
  }

  return (
    <PageShell brand={BRAND}>
      <GameScreen
        chart={<MarketChart series={series} markers={markers} />}
        dayLabel={dayLabel(state)}
        speeds={SPEED_CHOICES}
        currentSpeed={state.speed}
        legend={legendFor(state)}
        readouts={readoutsFor(state)}
        playerFigure={playerFigure(state)}
        benchmarkFigure={benchmarkFigure(state)}
        commentary={commentaryFor(state)}
        tiles={tilesFor(state)}
        cashOut={cashOutAction(state)}
        onSelectSpeed={(value) => {
          const choice = SPEED_CHOICES.find((option) => option.value === value)
          if (choice !== undefined) dispatch({ type: 'SET_SPEED', speed: choice.value })
        }}
        onStep={() => dispatch({ type: 'TICK' })}
        onOpenTrade={() => setSheet('trade')}
        onOpenData={() => setSheet('data')}
        onOpenSettings={() => setSheet('settings')}
        onCashOut={() => dispatch({ type: 'CASH_OUT' })}
      />

      {sheet === 'trade' && (
        <TradeSheet
          pending={pendingOrders(state)}
          onSubmit={placeOrder}
          onCancelOrder={(id) => dispatch({ type: 'CANCEL_ORDER', id })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'data' && (
        <AddDataSheet
          tiers={indicatorTiers(state)}
          complexity={complexityFor(readoutsFor(state))}
          onToggle={(key, value) => {
            const indicator = toIndicatorKey(key)
            if (indicator !== undefined) {
              dispatch({ type: 'SET_INDICATOR', key: indicator, value })
            }
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'settings' && (
        <SettingsSheet
          switches={realismSwitches(state)}
          onToggle={(key, value) => {
            const setting = toSettingKey(key)
            if (setting !== undefined) dispatch({ type: 'SET_SETTING', key: setting, value })
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </PageShell>
  )
}
