import { nasdaq } from "@/data/marketData";

/** Simple moving average of the close price ending at (and including)
 * absolute index `endDay`, over `period` days. Returns null if there is
 * not yet enough history. */
export function sma(endDay: number, period: number): number | null {
  if (endDay < period - 1) return null;
  let sum = 0;
  for (let i = endDay - period + 1; i <= endDay; i++) {
    sum += nasdaq.close[i]!;
  }
  return sum / period;
}

export interface BollingerBands {
  mid: number;
  upper: number;
  lower: number;
}

export function bollingerBands(
  endDay: number,
  period = 20,
  multiplier = 2,
): BollingerBands | null {
  const mid = sma(endDay, period);
  if (mid === null) return null;
  let variance = 0;
  for (let i = endDay - period + 1; i <= endDay; i++) {
    variance += Math.pow(nasdaq.close[i]! - mid, 2);
  }
  const sd = Math.sqrt(variance / period);
  return { mid, upper: mid + multiplier * sd, lower: mid - multiplier * sd };
}

/** Average true range approximated from close-to-close moves, since the
 * baked data is close-only (no intraday high/low). This is a simplified
 * volatility read, not a textbook ATR computed from real daily ranges. */
export function approximateAtr(endDay: number, period = 14): number | null {
  if (endDay < period) return null;
  let sum = 0;
  for (let i = endDay - period + 1; i <= endDay; i++) {
    sum += Math.abs(nasdaq.close[i]! - nasdaq.close[i - 1]!);
  }
  return sum / period;
}
