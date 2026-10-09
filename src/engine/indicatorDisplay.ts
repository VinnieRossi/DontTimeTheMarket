import { macro } from "@/data/marketData";
import { rsiFromMomentum, macdFromMomentum } from "./momentum";
import { approximateAtr } from "./technicals";
import type { GameState } from "./types";

export interface IndicatorChip {
  key: string;
  label: string;
  value: string;
}

function at<T>(arr: T[], day: number): T | undefined {
  return arr[day];
}

export function indicatorChips(state: GameState): IndicatorChip[] {
  const chips: IndicatorChip[] = [];
  const ind = state.indicators;
  const day = state.day;

  if (ind.volume) {
    // The baked series is close-only (no real volume figure); shown as a
    // clearly-labeled illustrative read rather than a real data point.
    const synthetic = 500_000 + ((day * 9301 + 49297) % 2_000_000);
    chips.push({
      key: "volume",
      label: "Volume (illustrative)",
      value: synthetic.toLocaleString(),
    });
  }
  if (ind.rsi) {
    chips.push({
      key: "rsi",
      label: "RSI (14)",
      value: rsiFromMomentum(state.momentum).toFixed(1),
    });
  }
  if (ind.macd) {
    chips.push({
      key: "macd",
      label: "MACD",
      value: macdFromMomentum(state.momentum).toFixed(2),
    });
  }
  if (ind.atr) {
    const atr = approximateAtr(day);
    chips.push({
      key: "atr",
      label: "ATR (volatility)",
      value: atr === null ? "n/a" : atr.toFixed(2),
    });
  }
  if (ind.vix) {
    const v = at(macro.vix, day);
    chips.push({
      key: "vix",
      label: "Volatility index",
      value: v === undefined ? "n/a" : v.toFixed(1),
    });
  }
  if (ind.yieldCurve) {
    const dgs10 = at(macro.dgs10, day);
    const dgs2 = at(macro.dgs2, day);
    const spread = dgs10 !== undefined && dgs2 !== undefined ? dgs10 - dgs2 : undefined;
    chips.push({
      key: "yieldCurve",
      label: "Yield curve 10y-2y",
      value: spread === undefined ? "n/a" : `${spread.toFixed(2)}%`,
    });
  }
  if (ind.cpi) {
    const v = at(macro.cpi, day);
    chips.push({ key: "cpi", label: "CPI index", value: v === undefined ? "n/a" : v.toFixed(1) });
  }
  if (ind.unemployment) {
    const v = at(macro.unemployment, day);
    chips.push({
      key: "unemployment",
      label: "Unemployment",
      value: v === undefined ? "n/a" : `${v.toFixed(1)}%`,
    });
  }
  if (ind.fedFunds) {
    const v = at(macro.fedFunds, day);
    chips.push({
      key: "fedFunds",
      label: "Fed funds rate",
      value: v === undefined ? "n/a" : `${v.toFixed(2)}%`,
    });
  }
  if (ind.m2) {
    const v = at(macro.m2, day);
    chips.push({ key: "m2", label: "M2 money supply", value: v === undefined ? "n/a" : v.toFixed(0) });
  }

  return chips;
}

export const COMPLEXITY_LABELS = [
  "Clean",
  "Busy",
  "Overkill",
  "Pretty Dense",
  "Full Terminal Mode",
] as const;

export function complexityLabel(chipCount: number): string {
  const level = Math.min(
    COMPLEXITY_LABELS.length - 1,
    Math.floor(chipCount / 2.5),
  );
  return COMPLEXITY_LABELS[level]!;
}
