/**
 * What this package needs to know about a chart, declared here rather than imported from the
 * simulation. The engine produces the same shape, so the app hands its output straight across;
 * the point of restating it is that a component depends on the picture it draws and not on the
 * thing that computed it, which is what keeps a story able to render one from fixed numbers.
 */

export type ChartSeriesRole =
  | 'price'
  | 'player'
  | 'benchmark'
  | 'sma20'
  | 'sma50'
  | 'bollingerUpper'
  | 'bollingerLower'

export interface ChartPointView {
  /** Elapsed trading days since the run started, which is the only time axis a player sees. */
  day: number
  value: number
}

export interface ChartSeriesView {
  role: ChartSeriesRole
  points: readonly ChartPointView[]
}

export interface ChartMarkerView {
  day: number
  value: number
  side: 'buy' | 'sell'
}
