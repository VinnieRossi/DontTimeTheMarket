'use client'

import {
  ALLOCATION_STEP_PCT,
  type Allocation,
  type DisguisedCompany,
  isAllocationComplete,
  type PortfolioRunState,
  portfolioBuyAmountForPercent,
  portfolioSellQtyForPercent,
  splitEvenly,
  stepAllocation,
  toggleAllocation,
} from '@dttm/engine'
import { browseRoster, startPortfolioRun } from '@dttm/engine/stocks'
import type { UseGameResult } from '@dttm/hooks'
import {
  AddDataSheet,
  CompanyPickerSheet,
  CompanySheet,
  EndScreen,
  GameScreen,
  HoldingsList,
  MarketChart,
  PageShell,
  PortfolioBuilder,
  SettingsSheet,
  TradeSheet,
} from '@dttm/ui'
import type { TradeIntent } from '@dttm/validation'
import { useState } from 'react'
import {
  BRAND,
  commentaryFor,
  complexityFor,
  indicatorTiers,
  RUN_LENGTH_CHOICES,
  realismSwitches,
  SPEED_CHOICES,
  toIndicatorKey,
  toSettingKey,
} from '@/lib/game-view'
import {
  ALL_SECTORS,
  allocationRows,
  allocationTotalLabel,
  BUILDER_COPY,
  companyCards,
  companyDetail,
  detailAction,
  HALL_OF_FAME,
  HOLDINGS_EMPTY_NOTE,
  holdingRows,
  portfolioBenchmarkFigure,
  portfolioCashOutAction,
  portfolioChartView,
  portfolioDayLabel,
  portfolioEndScreenView,
  portfolioLegend,
  portfolioPendingOrders,
  portfolioPlayerFigure,
  portfolioReadouts,
  portfolioTiles,
  rebalanceAction,
  sectorGroups,
  startAction,
  tradeSubject,
} from '@/lib/portfolio-view'

/**
 * Portfolio mode, composed: the builder before a run and the run after it.
 *
 * This is the only module in the app that imports the company roster, and it is loaded on demand,
 * so an index run never downloads it. Everything the screens show comes from the view mapping and
 * every rule comes from the engine; what is held here is which sheet is open and, before a run,
 * the draft the player is assembling.
 */

type Sheet =
  | { kind: 'none' }
  | { kind: 'data' }
  | { kind: 'settings' }
  | { kind: 'picker' }
  | { kind: 'company'; assetId: string }
  | { kind: 'trade'; assetId: string }

export interface PortfolioAppProps {
  /**
   * The seed the run will be opened with. The builder disguises the roster under it, so the names
   * on the cards are the names the run itself will use.
   */
  seed: number
  run: PortfolioRunState | null
  dispatch: UseGameResult['dispatch']
  openRun: UseGameResult['openRun']
  /** Leaves portfolio mode entirely, back to the opening screen. */
  onExit: () => void
}

export function PortfolioApp({ seed, run, dispatch, openRun, onExit }: PortfolioAppProps) {
  const [group, setGroup] = useState<string>(ALL_SECTORS)
  const [allocations, setAllocations] = useState<readonly Allocation[]>([])
  const [runLength, setRunLength] = useState(RUN_LENGTH_CHOICES[1]?.value ?? 'standard')
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' })

  const companies: readonly DisguisedCompany[] =
    run === null ? browseRoster(seed) : run.universe.map((asset) => asset.company)
  const groups = sectorGroups(companies)
  const openCompany = (assetId: string): void => setSheet({ kind: 'company', assetId })
  const close = (): void => setSheet({ kind: 'none' })

  if (run === null) {
    const detail =
      sheet.kind === 'company' ? companies.find((c) => c.id === sheet.assetId) : undefined
    return (
      <PageShell brand={BRAND}>
        <PortfolioBuilder
          heading={BUILDER_COPY.heading}
          lede={BUILDER_COPY.lede}
          companies={companyCards(companies, allocations, group)}
          groups={groups}
          currentGroup={group}
          emptyNote={BUILDER_COPY.emptyNote}
          runLengths={RUN_LENGTH_CHOICES}
          selectedRunLength={runLength}
          allocations={allocationRows(allocations, companies)}
          allocationTotal={allocationTotalLabel(allocations)}
          allocationComplete={isAllocationComplete(allocations)}
          allocationPrompt={BUILDER_COPY.allocationPrompt}
          start={startAction(allocations)}
          survivorshipNote={BUILDER_COPY.survivorshipNote}
          hallOfFameHeading={BUILDER_COPY.hallOfFameHeading}
          hallOfFame={HALL_OF_FAME}
          hallOfFameNote={BUILDER_COPY.hallOfFameNote}
          onSelectGroup={setGroup}
          onToggleCompany={(assetId) =>
            setAllocations((current) => toggleAllocation(current, assetId))
          }
          onOpenCompany={openCompany}
          onSelectRunLength={(value) => {
            const choice = RUN_LENGTH_CHOICES.find((option) => option.value === value)
            if (choice !== undefined) setRunLength(choice.value)
          }}
          onIncrease={(assetId) =>
            setAllocations((current) => stepAllocation(current, assetId, ALLOCATION_STEP_PCT))
          }
          onDecrease={(assetId) =>
            setAllocations((current) => stepAllocation(current, assetId, -ALLOCATION_STEP_PCT))
          }
          onSplitEvenly={() => setAllocations((current) => splitEvenly(current))}
          onStart={() => openRun(startPortfolioRun(seed, runLength, allocations))}
          onBack={onExit}
        />

        {detail !== undefined && (
          <CompanySheet
            company={companyDetail(detail)}
            action={detailAction(allocations.some((a) => a.assetId === detail.id))}
            onAct={() => {
              setAllocations((current) => toggleAllocation(current, detail.id))
              close()
            }}
            onClose={close}
          />
        )}
      </PageShell>
    )
  }

  if (run.phase === 'ended') {
    return (
      <PageShell brand={BRAND} narrow>
        <EndScreen
          {...portfolioEndScreenView(run)}
          onContinue={() => dispatch({ type: 'CONTINUE' })}
          onPlayAgain={onExit}
        />
      </PageShell>
    )
  }

  const { series, markers } = portfolioChartView(run)
  const placeOrder = (assetId: string, intent: TradeIntent): void => {
    dispatch({
      type: 'PLACE_ORDER',
      order:
        intent.side === 'buy'
          ? {
              side: 'buy',
              orderType: 'market',
              assetId,
              amountUsd: portfolioBuyAmountForPercent(run, intent.percent),
            }
          : {
              side: 'sell',
              orderType: 'market',
              assetId,
              qty: portfolioSellQtyForPercent(run, assetId, intent.percent),
            },
    })
  }

  const detail =
    sheet.kind === 'company' ? companies.find((c) => c.id === sheet.assetId) : undefined

  return (
    <PageShell brand={BRAND}>
      <GameScreen
        chart={<MarketChart series={series} markers={markers} />}
        dayLabel={portfolioDayLabel(run)}
        speeds={SPEED_CHOICES}
        currentSpeed={run.speed}
        legend={portfolioLegend(run)}
        readouts={portfolioReadouts(run)}
        playerFigure={portfolioPlayerFigure(run)}
        benchmarkFigure={portfolioBenchmarkFigure(run)}
        commentary={commentaryFor(run)}
        tiles={portfolioTiles(run)}
        cashOut={portfolioCashOutAction(run)}
        tradeLabel="Buy a company"
        rebalance={rebalanceAction(run)}
        holdings={
          <HoldingsList
            holdings={holdingRows(run)}
            emptyNote={HOLDINGS_EMPTY_NOTE}
            onTradeHolding={(assetId) => setSheet({ kind: 'trade', assetId })}
          />
        }
        onSelectSpeed={(value) => {
          const choice = SPEED_CHOICES.find((option) => option.value === value)
          if (choice !== undefined) dispatch({ type: 'SET_SPEED', speed: choice.value })
        }}
        onStep={() => dispatch({ type: 'TICK' })}
        onOpenTrade={() => setSheet({ kind: 'picker' })}
        onOpenData={() => setSheet({ kind: 'data' })}
        onOpenSettings={() => setSheet({ kind: 'settings' })}
        onCashOut={() => dispatch({ type: 'CASH_OUT' })}
        onRebalance={() => dispatch({ type: 'REBALANCE' })}
      />

      {sheet.kind === 'picker' && (
        <CompanyPickerSheet
          companies={companyCards(companies, [], group)}
          groups={groups}
          currentGroup={group}
          emptyNote={BUILDER_COPY.emptyNote}
          lede={BUILDER_COPY.pickerLede}
          onSelectGroup={setGroup}
          onPick={(assetId) => setSheet({ kind: 'trade', assetId })}
          onOpenCompany={openCompany}
          onClose={close}
        />
      )}
      {sheet.kind === 'trade' && (
        <TradeSheet
          pending={portfolioPendingOrders(run)}
          subject={tradeSubject(run, sheet.assetId)}
          marketOnly
          onSubmit={(intent) => placeOrder(sheet.assetId, intent)}
          onCancelOrder={(id) => dispatch({ type: 'CANCEL_ORDER', id })}
          onClose={close}
        />
      )}
      {detail !== undefined && (
        <CompanySheet
          company={companyDetail(detail)}
          action={{ label: 'Trade this company', enabled: true }}
          onAct={() => setSheet({ kind: 'trade', assetId: detail.id })}
          onClose={close}
        />
      )}
      {sheet.kind === 'data' && (
        <AddDataSheet
          tiers={indicatorTiers(run)}
          complexity={complexityFor(portfolioReadouts(run))}
          onToggle={(key, value) => {
            const indicator = toIndicatorKey(key)
            if (indicator !== undefined) dispatch({ type: 'SET_INDICATOR', key: indicator, value })
          }}
          onClose={close}
        />
      )}
      {sheet.kind === 'settings' && (
        <SettingsSheet
          switches={realismSwitches(run)}
          onToggle={(key, value) => {
            const setting = toSettingKey(key)
            if (setting !== undefined) dispatch({ type: 'SET_SETTING', key: setting, value })
          }}
          onClose={close}
        />
      )}
    </PageShell>
  )
}
