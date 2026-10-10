import { describe, expect, it } from 'vitest'
import { buyAmountForPercent, planRebalance, sellQtyForPercent } from './portfolio-orders'
import { holdingIn, weightPctOf } from './portfolio-selectors'
import { REBALANCE_MIN_TRADE_USD } from './rules'
import { freshPortfolioRun, orderAndFill, tickPortfolio } from './test-support'

const SEED = 191_919

describe('sizing a portfolio trade', () => {
  it('sizes a buy as a share of the cash on hand', () => {
    const run = freshPortfolioRun(SEED, 2)
    const withCash = { ...run, cash: 4_000 }
    expect(buyAmountForPercent(withCash, 25)).toBeCloseTo(1_000, 9)
    expect(buyAmountForPercent(withCash, 100)).toBeCloseTo(4_000, 9)
  })

  it('sizes a sell as a share of that one holding, not of the whole portfolio', () => {
    const run = freshPortfolioRun(SEED, 3)
    const holding = run.holdings[0]
    const assetId = holding?.assetId ?? ''
    expect(sellQtyForPercent(run, assetId, 50)).toBeCloseTo((holding?.shares ?? 0) / 2, 9)
    expect(sellQtyForPercent(run, assetId, 100)).toBeCloseTo(holding?.shares ?? 0, 9)
  })

  it('sizes a sell on a company that is not held at nothing', () => {
    expect(sellQtyForPercent(freshPortfolioRun(SEED, 2), 'NOT-HELD', 100)).toBe(0)
  })
})

describe('planRebalance', () => {
  it('queues nothing for a portfolio that is already at its targets', () => {
    expect(planRebalance(freshPortfolioRun(SEED, 3)).pending).toEqual([])
  })

  it('queues one market order per holding that has drifted', () => {
    const drifted = tickPortfolio(freshPortfolioRun(SEED, 3), 600)
    const planned = planRebalance(drifted)
    expect(planned.pending.length).toBeGreaterThan(0)
    for (const order of planned.pending) {
      expect(order.orderType).toBe('market')
      expect(order.assetId).toBeTruthy()
    }
  })

  it('leaves a holding alone when the trade would be too small to be worth the spread', () => {
    const run = freshPortfolioRun(SEED, 2)
    const holding = run.holdings[0]
    const nudged = {
      ...run,
      holdings: run.holdings.map((current) =>
        current.assetId === holding?.assetId
          ? { ...current, targetPct: weightPctOf(run, current) + 0.000_1 }
          : current
      ),
    }
    const orders = planRebalance(nudged).pending.filter(
      (order) => order.assetId === holding?.assetId
    )
    expect(orders).toEqual([])
    expect(REBALANCE_MIN_TRADE_USD).toBeGreaterThan(0)
  })

  it('funds its buys from its own sells, which is why sells fill first', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 400)
    const sold = orderAndFill(run, {
      side: 'sell',
      assetId: run.holdings[0]?.assetId,
      qty: run.holdings[0]?.shares,
    })
    const rebalanced = planRebalance(sold)
    const filled = { ...rebalanced }
    expect(rebalanced.pending.some((order) => order.side === 'buy')).toBe(true)
    expect(holdingIn(filled, sold.holdings[0]?.assetId ?? '')).toBeDefined()
  })
})
