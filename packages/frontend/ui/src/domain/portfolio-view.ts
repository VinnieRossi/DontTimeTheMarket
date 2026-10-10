import type { ChartPointView } from './chart-view'
import type { FigureView } from './game-view'

/**
 * What the portfolio screens need to render, with nothing left to work out.
 *
 * Every figure arrives already formatted and every label already written, for the same reason the
 * index screens do: a component that computed a weight or decided whether a holding had drifted
 * would need the simulation to do it, and then it could not be rendered from a story.
 *
 * One thing is worth saying about the names in here. A company is identified by `assetId`, which
 * a component only ever hands back through a callback, and shown by `ticker` and `name`, which are
 * the generated ones. A component is never told which real company it is drawing, because during
 * a run nothing on screen is allowed to say.
 */

export interface CompanyCardView {
  assetId: string
  ticker: string
  name: string
  sector: string
  industry: string
  /** Already formatted facts: the size bucket, the yield, the volatility. */
  tags: readonly string[]
  selected: boolean
}

export interface AllocationRowView {
  assetId: string
  ticker: string
  name: string
  /** The share of the portfolio, formatted, for example "33%". */
  percent: string
  canIncrease: boolean
  canDecrease: boolean
}

export interface HoldingRowView {
  assetId: string
  ticker: string
  name: string
  /** The sector and industry, which stay truthful while the name does not. */
  detail: string
  value: string
  /** What the holding weighs now against what it is meant to weigh. */
  weight: string
  /** How far it has drifted from its target, signed. */
  drift: string
  direction: 'up' | 'down'
  spark: readonly ChartPointView[]
}

export interface TrendView {
  label: string
  points: readonly ChartPointView[]
  /** What the shape means, in words, since the figures themselves are deliberately not shown. */
  caption: string
}

export interface CompanyDetailView {
  assetId: string
  ticker: string
  name: string
  sector: string
  industry: string
  stats: readonly FigureView[]
  trends: readonly TrendView[]
  note: string
}

/** One line of the end-of-run reveal: who the company actually was. */
export interface RevealRowView {
  assetId: string
  ticker: string
  fakeName: string
  realName: string
  detail: string
}

/** A famous collapse, shown as history rather than as something to trade. */
export interface HallOfFameView {
  name: string
  note: string
}
