import { nasdaq } from "@/data/marketData";
import { bollingerBands, sma } from "./technicals";
import { STARTING_CASH, type GameState } from "./types";
import { BOGLE_NPC_ID } from "./npc";
import type { ChartLine, ChartMarker } from "@/components/MarketChart";

const WINDOW_DAYS = 180;

/** Builds the market-price line, the player value line, the Bogle NPC
 * value line, any active moving-average/Bollinger overlays, and the
 * buy/sell trade markers for the chart, all rebased to start at 100 so
 * the real absolute price level stays hidden (report.md section 2). */
export function buildChartData(state: GameState): {
  lines: ChartLine[];
  markers: ChartMarker[];
} {
  const end = state.day;
  const start = Math.max(state.startDay, end - WINDOW_DAYS);
  const basePrice = nasdaq.close[state.startDay]!;

  const priceLine: ChartLine = {
    id: "price",
    color: "#132235",
    lineWidth: 2,
    data: [],
  };
  for (let i = start; i <= end; i++) {
    const elapsed = i - state.startDay;
    priceLine.data.push({
      day: elapsed,
      value: (100 * nasdaq.close[i]!) / basePrice,
    });
  }

  const historyByDay = new Map(state.valueHistory.map((h) => [h.day, h]));
  let lastKnownPlayer = STARTING_CASH;
  let lastKnownNpc = STARTING_CASH;
  const playerLine: ChartLine = {
    id: "player",
    color: "#0e7fae",
    lineWidth: 2,
    data: [],
  };
  const npcLine: ChartLine = {
    id: "npc",
    color: "#5b7186",
    lineWidth: 2,
    lineStyle: "dashed",
    data: [],
  };
  for (let i = start; i <= end; i++) {
    const entry = historyByDay.get(i);
    if (entry) {
      lastKnownPlayer = entry.playerValue;
      lastKnownNpc = entry.npcValues[BOGLE_NPC_ID] ?? lastKnownNpc;
    }
    const elapsed = i - state.startDay;
    playerLine.data.push({ day: elapsed, value: (100 * lastKnownPlayer) / STARTING_CASH });
    npcLine.data.push({ day: elapsed, value: (100 * lastKnownNpc) / STARTING_CASH });
  }

  const lines: ChartLine[] = [npcLine, priceLine, playerLine];

  if (state.indicators.sma) {
    const sma20: ChartLine = { id: "sma20", color: "#f4a300", lineWidth: 1, data: [] };
    const sma50: ChartLine = { id: "sma50", color: "#8fa7bd", lineWidth: 1, data: [] };
    for (let i = start; i <= end; i++) {
      const elapsed = i - state.startDay;
      const s20 = sma(i, 20);
      const s50 = sma(i, 50);
      if (s20 !== null) sma20.data.push({ day: elapsed, value: (100 * s20) / basePrice });
      if (s50 !== null) sma50.data.push({ day: elapsed, value: (100 * s50) / basePrice });
    }
    lines.push(sma20, sma50);
  }

  if (state.indicators.bb) {
    const upper: ChartLine = { id: "bbUpper", color: "rgba(14,127,174,0.45)", lineWidth: 1, lineStyle: "dashed", data: [] };
    const lower: ChartLine = { id: "bbLower", color: "rgba(14,127,174,0.45)", lineWidth: 1, lineStyle: "dashed", data: [] };
    for (let i = start; i <= end; i++) {
      const elapsed = i - state.startDay;
      const bb = bollingerBands(i);
      if (bb !== null) {
        upper.data.push({ day: elapsed, value: (100 * bb.upper) / basePrice });
        lower.data.push({ day: elapsed, value: (100 * bb.lower) / basePrice });
      }
    }
    lines.push(upper, lower);
  }

  const markers: ChartMarker[] = state.tradeLog
    .filter((t) => t.day >= start - state.startDay && t.day <= end - state.startDay)
    .map((t) => ({
      day: t.day,
      value: (100 * t.price) / basePrice,
      side: t.side,
    }));

  return { lines, markers };
}
