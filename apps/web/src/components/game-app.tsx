'use client'

import { buyAmountForPercent, type RunLength, sellQtyForPercent } from '@dttm/engine'
import { useGame } from '@dttm/hooks'
import {
  AddDataSheet,
  EndScreen,
  GameScreen,
  MarketChart,
  PageShell,
  SettingsSheet,
  StartScreen,
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
  RUN_LENGTH_CHOICES,
  readoutsFor,
  realismSwitches,
  SPEED_CHOICES,
  START_SCREEN_COPY,
  tilesFor,
  toIndicatorKey,
  toSettingKey,
} from '@/lib/game-view'

type OpenSheet = 'trade' | 'data' | 'settings' | null

/**
 * The composition. It calls the one hook, maps what it returns into what the screens take, and
 * turns a callback back into an action for the engine. It holds no rule of the game and no markup
 * beyond choosing which screen is on.
 */
export function GameApp() {
  const { state, dispatch, startRun, reset } = useGame()
  const [runLength, setRunLength] = useState<RunLength>('standard')
  const [sheet, setSheet] = useState<OpenSheet>(null)

  if (state === null) {
    return (
      <PageShell brand={BRAND} narrow>
        <StartScreen
          heading={START_SCREEN_COPY.heading}
          lede={START_SCREEN_COPY.lede}
          footnote={START_SCREEN_COPY.footnote}
          runLengths={RUN_LENGTH_CHOICES}
          selectedRunLength={runLength}
          onSelectRunLength={(value) => {
            const choice = RUN_LENGTH_CHOICES.find((option) => option.value === value)
            if (choice !== undefined) setRunLength(choice.value)
          }}
          onStart={() => startRun(runLength)}
        />
      </PageShell>
    )
  }

  if (state.phase === 'ended') {
    const view = endScreenView(state)
    return (
      <PageShell brand={BRAND} narrow>
        <EndScreen
          {...view}
          onContinue={() => dispatch({ type: 'CONTINUE' })}
          onPlayAgain={reset}
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
          complexity={complexityFor(state)}
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
