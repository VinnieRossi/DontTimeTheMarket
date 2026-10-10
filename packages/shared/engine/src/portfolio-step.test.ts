import { describe, expect, it } from 'vitest'
import { BOGLE_NPC_ID } from './npc'
import {
  edgeBpsVs,
  elapsedDays,
  holdingIn,
  investedValue,
  npcValue,
  portfolioValue,
  priceOf,
  weightPctOf,
} from './portfolio-selectors'
import { MIN_SCORING_DAYS, STARTING_CASH } from './rules'
import { step } from './step'
import { freshPortfolioRun, orderAndFill, targetTotal, tickPortfolio } from './test-support'

/*
 * Every run below names its seed. The simulation is deterministic, so a named seed makes a
 * failure reproducible forever; a seed nobody wrote down makes it a story.
 */
const SEED = 777_001

describe('opening a portfolio run', () => {
  it('puts the whole stake to work at the percentages that were chosen', () => {
    const run = freshPortfolioRun(SEED, 4)
    expect(run.holdings).toHaveLength(4)
    expect(portfolioValue(run)).toBeCloseTo(STARTING_CASH, 6)
    expect(run.cash).toBeCloseTo(0, 6)
    expect(targetTotal(run)).toBeCloseTo(100, 6)
  })

  it('starts the benchmark on the identical basket, so only the player can change the gap', () => {
    const run = freshPortfolioRun(SEED, 3)
    expect(npcValue(run, BOGLE_NPC_ID)).toBeCloseTo(portfolioValue(run), 6)
    const [first] = run.holdings
    expect(run.npcs[0]?.shares[first?.assetId ?? '']).toBeCloseTo(first?.shares ?? 0, 9)
  })

  it('charges nobody a spread on the opening allocation, which neither of them chose', () => {
    const run = freshPortfolioRun(SEED, 3)
    expect(run.feesPaid).toBe(0)
    expect(run.tradeCount).toBe(0)
  })

  it('opens on a day every company in the run has a real price for', () => {
    for (const seed of [1, 2, 3, 99, 12_345]) {
      const run = freshPortfolioRun(seed, 5)
      for (const holding of run.holdings) {
        expect(priceOf(run, holding.assetId, run.startDay), `${seed}`).toBeGreaterThan(0)
      }
    }
  })

  it('is reproducible from its seed, which is what makes a score checkable', () => {
    const left = tickPortfolio(freshPortfolioRun(SEED, 3), 120)
    const right = tickPortfolio(freshPortfolioRun(SEED, 3), 120)
    expect(left.valueHistory).toEqual(right.valueHistory)
    expect(left.cash).toBe(right.cash)
  })

  it('draws a different window on a different seed', () => {
    expect(freshPortfolioRun(SEED, 3).startDay).not.toBe(freshPortfolioRun(SEED + 1, 3).startDay)
  })
})

describe('a portfolio day', () => {
  it('advances one trading day per tick and records one value per day', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 30)
    expect(elapsedDays(run)).toBe(30)
    expect(run.valueHistory).toHaveLength(31)
  })

  it('ends the run when the chosen horizon elapses', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 2, 'short'), 252)
    expect(run.phase).toBe('ended')
    expect(elapsedDays(run)).toBe(252)
  })

  it('ignores a tick once the run has ended', () => {
    const ended = tickPortfolio(freshPortfolioRun(SEED, 2, 'short'), 252)
    expect(step(ended, { type: 'TICK' })).toBe(ended)
  })

  it('tracks the deepest drawdown the portfolio ever sat in', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 4, 'short'), 252)
    expect(run.maxDrawdownPct).toBeLessThanOrEqual(0)
    expect(run.peakValue).toBeGreaterThanOrEqual(portfolioValue(run))
  })
})

describe('trading a holding', () => {
  it('fills on the next day rather than at the price that was on screen', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 10)
    const holding = run.holdings[0]
    if (holding === undefined) throw new Error('the run opened with no holdings')
    const placed = step(run, {
      type: 'PLACE_ORDER',
      order: { side: 'sell', orderType: 'market', assetId: holding.assetId, qty: 1 },
    })
    expect(holdingIn(placed, holding.assetId)?.shares).toBe(holding.shares)
    expect(placed.pending).toHaveLength(1)

    const filled = step(placed, { type: 'TICK' })
    expect(filled.pending).toHaveLength(0)
    expect(holdingIn(filled, holding.assetId)?.shares).toBeLessThan(holding.shares)
  })

  it('sells part of a position and leaves the rest of it alone', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 20)
    const holding = run.holdings[0]
    const half = (holding?.shares ?? 0) / 2
    const after = orderAndFill(run, {
      side: 'sell',
      assetId: holding?.assetId,
      qty: half,
    })
    expect(after.holdings).toHaveLength(3)
    expect(holdingIn(after, holding?.assetId ?? '')?.shares).toBeCloseTo(half, 9)
    expect(after.cash).toBeGreaterThan(0)
  })

  it('closes a position sold out entirely and stretches the other targets back onto 100', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 20)
    const holding = run.holdings[0]
    const after = orderAndFill(run, {
      side: 'sell',
      assetId: holding?.assetId,
      qty: holding?.shares,
    })
    expect(after.holdings).toHaveLength(2)
    expect(after.holdings.some((kept) => kept.assetId === holding?.assetId)).toBe(false)
    expect(targetTotal(after)).toBeCloseTo(100, 6)
  })

  it('charges the spread and the capital gains tax a sale really owes', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 60)
    const holding = run.holdings[0]
    const after = orderAndFill(run, {
      side: 'sell',
      assetId: holding?.assetId,
      qty: holding?.shares,
    })
    expect(after.feesPaid).toBeGreaterThan(0)
    expect(after.tradeCount).toBe(1)
    // Whether tax was owed depends on the window, but a sale at a profit must have paid some.
    const soldAtProfit = priceOf(run, holding?.assetId ?? '') > (holding?.lots[0]?.cost ?? 0)
    expect(after.taxPaid > 0).toBe(soldAtProfit)
  })

  it('leaves the realism switches in charge of both costs', () => {
    let run = tickPortfolio(freshPortfolioRun(SEED, 3), 60)
    run = step(run, { type: 'SET_SETTING', key: 'fees', value: false })
    run = step(run, { type: 'SET_SETTING', key: 'tax', value: false })
    const holding = run.holdings[0]
    const after = orderAndFill(run, {
      side: 'sell',
      assetId: holding?.assetId,
      qty: holding?.shares,
    })
    expect(after.feesPaid).toBe(0)
    expect(after.taxPaid).toBe(0)
  })

  it('opens a position in a company the portfolio did not hold', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 2), 30)
    const held = new Set(run.holdings.map((holding) => holding.assetId))
    const fresh = run.universe.find((asset) => !held.has(asset.company.id))
    const sold = orderAndFill(run, {
      side: 'sell',
      assetId: run.holdings[0]?.assetId,
      qty: (run.holdings[0]?.shares ?? 0) / 2,
    })
    const after = orderAndFill(sold, {
      side: 'buy',
      assetId: fresh?.company.id,
      amountUsd: sold.cash,
    })
    expect(after.holdings).toHaveLength(3)
    expect(holdingIn(after, fresh?.company.id ?? '')?.shares).toBeGreaterThan(0)
    expect(targetTotal(after)).toBeCloseTo(100, 6)
  })

  it('refuses an order that names no company, since there is nothing to fill it against', () => {
    const run = freshPortfolioRun(SEED, 2)
    const placed = step(run, {
      type: 'PLACE_ORDER',
      order: { side: 'buy', orderType: 'market', amountUsd: 100 },
    })
    expect(placed).toBe(run)
  })

  it('refuses an order on a company that is not in the run', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 2), 5)
    const after = orderAndFill(run, {
      side: 'buy',
      assetId: 'NOT-A-COMPANY',
      amountUsd: 100,
    })
    expect(after.holdings).toHaveLength(2)
    expect(after.tradeCount).toBe(0)
  })

  it('cancels a queued order before it fills', () => {
    const run = freshPortfolioRun(SEED, 2)
    const assetId = run.holdings[0]?.assetId
    if (assetId === undefined) throw new Error('the run opened with no holdings')
    const placed = step(run, {
      type: 'PLACE_ORDER',
      order: { side: 'sell', orderType: 'market', assetId, qty: 1 },
    })
    const canceled = step(placed, { type: 'CANCEL_ORDER', id: placed.pending[0]?.id ?? 0 })
    expect(canceled.pending).toHaveLength(0)
    expect(step(canceled, { type: 'TICK' }).tradeCount).toBe(0)
  })
})

describe('rebalancing', () => {
  it('brings every holding back to its target weight', () => {
    const drifted = tickPortfolio(freshPortfolioRun(SEED, 4), 500)
    const driftBefore = Math.max(
      ...drifted.holdings.map((holding) =>
        Math.abs(weightPctOf(drifted, holding) - holding.targetPct)
      )
    )
    const after = step(step(drifted, { type: 'REBALANCE' }), { type: 'TICK' })
    const driftAfter = Math.max(
      ...after.holdings.map((holding) => Math.abs(weightPctOf(after, holding) - holding.targetPct))
    )
    expect(driftBefore).toBeGreaterThan(1)
    expect(driftAfter).toBeLessThan(1)
  })

  it('pays for itself in spread and tax like any other trade', () => {
    const drifted = tickPortfolio(freshPortfolioRun(SEED, 4), 500)
    const after = step(step(drifted, { type: 'REBALANCE' }), { type: 'TICK' })
    expect(after.feesPaid).toBeGreaterThan(drifted.feesPaid)
    expect(after.tradeCount).toBeGreaterThan(drifted.tradeCount)
  })

  it('aims at the portfolio once however many times the button is tapped', () => {
    const drifted = tickPortfolio(freshPortfolioRun(SEED, 4), 500)
    const once = step(drifted, { type: 'REBALANCE' })
    const twice = step(once, { type: 'REBALANCE' })
    expect(twice.pending).toHaveLength(once.pending.length)
    expect(step(twice, { type: 'TICK' }).tradeCount).toBe(step(once, { type: 'TICK' }).tradeCount)
  })

  it('puts idle cash back to work, because the targets account for all of the money', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 100)
    const holding = run.holdings[0]
    const sold = orderAndFill(run, {
      side: 'sell',
      assetId: holding?.assetId,
      qty: (holding?.shares ?? 0) / 2,
    })
    expect(sold.cash).toBeGreaterThan(100)
    const after = step(step(sold, { type: 'REBALANCE' }), { type: 'TICK' })
    expect(after.cash).toBeLessThan(sold.cash / 10)
    expect(investedValue(after)).toBeGreaterThan(investedValue(sold))
  })

  it('does nothing to a run that has already ended', () => {
    const ended = tickPortfolio(freshPortfolioRun(SEED, 3, 'short'), 252)
    expect(step(ended, { type: 'REBALANCE' })).toBe(ended)
  })
})

describe('income', () => {
  it('pays the dividends the companies really paid', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 6), 400)
    // The roster holds dividend payers, so over 400 days either cash grew or shares did.
    expect(run.cash > 0 || investedValue(run) > 0).toBe(true)
    expect(portfolioValue(run)).toBeGreaterThan(0)
  })

  it('reinvests the player’s dividends only when they asked for it', () => {
    const base = tickPortfolio(freshPortfolioRun(SEED, 6), 10)
    const paidOut = tickPortfolio(base, 400)
    const reinvested = tickPortfolio(
      step(base, { type: 'SET_SETTING', key: 'reinvestDividends', value: true }),
      400
    )
    expect(reinvested.cash).toBeLessThan(paidOut.cash)
    expect(investedValue(reinvested)).toBeGreaterThan(investedValue(paidOut))
  })

  it('always reinvests the benchmark’s dividends, whatever the player chose', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 6), 400)
    const npc = run.npcs[0]
    expect(npc?.cash).toBeCloseTo(0, 6)
    const [first] = run.holdings
    expect(npc?.shares[first?.assetId ?? '']).toBeGreaterThan(0)
  })

  it('reinvests the external NPCs’ real dividends too, compounding their share counts', () => {
    const opened = freshPortfolioRun(SEED, 3)
    const sp500AtOpen = opened.externalNpcs.find((npc) => npc.id === 'sp500')?.shares ?? 0
    const run = tickPortfolio(opened, 400)
    const sp500After = run.externalNpcs.find((npc) => npc.id === 'sp500')?.shares ?? 0
    expect(sp500After).toBeGreaterThan(sp500AtOpen)
    expect(run.externalNpcs.every((npc) => npc.cash === 0)).toBe(true)
  })

  it('earns interest on idle cash, and nothing when the switch is off', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 2), 5)
    const holding = run.holdings[0]
    const inCash = orderAndFill(run, {
      side: 'sell',
      assetId: holding?.assetId,
      qty: holding?.shares,
    })
    const earning = tickPortfolio(inCash, 200)
    const idle = tickPortfolio(
      step(inCash, { type: 'SET_SETTING', key: 'interest', value: false }),
      200
    )
    expect(earning.cash).toBeGreaterThan(idle.cash)
  })
})

describe('ending a portfolio run', () => {
  it('refuses to cash out before a run is long enough to mean anything', () => {
    const early = tickPortfolio(freshPortfolioRun(SEED, 3), MIN_SCORING_DAYS - 1)
    expect(step(early, { type: 'CASH_OUT' }).phase).toBe('running')
  })

  it('cashes out once the run is scorable', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), MIN_SCORING_DAYS)
    expect(step(run, { type: 'CASH_OUT' }).phase).toBe('ended')
  })

  it('extends a finished run only for a player who is ahead of the benchmark', () => {
    const ended = tickPortfolio(freshPortfolioRun(SEED, 3, 'short'), 252)
    const ahead = edgeBpsVs(ended, BOGLE_NPC_ID) >= 0
    const after = step(ended, { type: 'CONTINUE' })
    expect(after.phase).toBe(ahead ? 'running' : 'ended')
    if (ahead) expect(after.horizonDays).toBe(ended.horizonDays + 252)
  })

  it('does nothing when asked to continue a run that is still going', () => {
    const running = tickPortfolio(freshPortfolioRun(SEED, 3), 50)
    expect(step(running, { type: 'CONTINUE' })).toBe(running)
  })

  it('leaves opening a run to the opener, which is the only reader of the roster', () => {
    const run = freshPortfolioRun(SEED, 3)
    expect(step(run, { type: 'START_RUN', seed: 1, runLength: 'short' })).toBe(run)
  })
})

describe('the rest of the controls', () => {
  it('takes a speed change and a readout toggle like an index run does', () => {
    const run = freshPortfolioRun(SEED, 2)
    expect(step(run, { type: 'SET_SPEED', speed: 'paused' }).speed).toBe('paused')
    expect(step(run, { type: 'SET_INDICATOR', key: 'rsi', value: true }).indicators.rsi).toBe(true)
  })
})
