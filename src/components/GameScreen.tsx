"use client";

import { useState } from "react";
import { buildChartData } from "@/engine/chartData";
import { COMMENT_COPY } from "@/engine/commentCopy";
import { indicatorChips } from "@/engine/indicatorDisplay";
import { BOGLE_NPC_ID } from "@/engine/npc";
import {
  canCashOut,
  currentPrice,
  elapsedDays,
  npcValue,
  playerValue,
  runningGapPctVs,
} from "@/engine/selectors";
import { MIN_SCORING_DAYS, type Action, type GameState, type Speed } from "@/engine/types";
import { MarketChart } from "./MarketChart";
import { TradeSheet } from "./TradeSheet";
import { AddDataSheet } from "./AddDataSheet";
import { SettingsSheet } from "./SettingsSheet";

const SPEEDS: Speed[] = ["paused", "1x", "4x", "16x"];

function formatMoney(v: number): string {
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function GameScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
}) {
  const [sheet, setSheet] = useState<"trade" | "data" | "settings" | null>(null);

  const { lines, markers } = buildChartData(state);
  const chips = indicatorChips(state);
  const gap = runningGapPctVs(state, BOGLE_NPC_ID);
  const pv = playerValue(state);
  const nv = npcValue(state, BOGLE_NPC_ID);
  const cashOutReady = canCashOut(state);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <div className="bg-card shadow-[0_2px_0_var(--color-line),0_16px_32px_-20px_rgba(14,127,174,.35)] rounded-card mb-4 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sub text-xs font-bold">
            Day {elapsedDays(state) + 1} / {state.horizonDays}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => dispatch({ type: "SET_SPEED", speed: s })}
                className={`rounded-full border-[1.5px] px-3 py-1.5 text-xs font-bold ${
                  state.speed === s
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-white text-ink"
                }`}
              >
                {s === "paused" ? "Pause" : s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => dispatch({ type: "TICK" })}
              className="border-line rounded-full border-[1.5px] bg-white px-3 py-1.5 text-xs font-bold"
            >
              Step
            </button>
          </div>
        </div>

        <MarketChart lines={lines} markers={markers} height={280} />

        <div className="text-sub mt-1 flex flex-wrap gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1">
            <i className="bg-ink inline-block h-[3px] w-3.5 rounded" /> Market price
          </span>
          <span className="flex items-center gap-1">
            <i className="bg-accent inline-block h-[3px] w-3.5 rounded" /> Your value
          </span>
          <span className="flex items-center gap-1">
            <i className="border-sub inline-block h-0 w-3.5 border-t-2 border-dashed" /> Bogle NPC
          </span>
          {state.indicators.sma && (
            <>
              <span className="flex items-center gap-1">
                <i className="inline-block h-[3px] w-3.5 rounded bg-[#f4a300]" /> SMA 20
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block h-[3px] w-3.5 rounded bg-[#8fa7bd]" /> SMA 50
              </span>
            </>
          )}
          {state.indicators.bb && (
            <span className="flex items-center gap-1">
              <i className="border-accent/45 inline-block h-0 w-3.5 border-t-2 border-dashed" /> Bollinger
              Bands
            </span>
          )}
        </div>

        {chips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span
                key={c.key}
                className="bg-[#f3f8fb] border-line rounded-full border px-2.5 py-1 text-[11px] font-bold text-sub"
              >
                {c.label}
                <b className="text-ink ml-1">{c.value}</b>
              </span>
            ))}
          </div>
        )}

        <div className="border-line mt-2.5 flex justify-between border-t pt-2.5 text-sm">
          <div>
            <div className="text-sub text-[11px] font-bold uppercase">You</div>
            <div className="font-bold">{formatMoney(pv)}</div>
          </div>
          <div className="text-right">
            <div className="text-sub text-[11px] font-bold uppercase">Bogle NPC</div>
            <div className="font-bold">{formatMoney(nv)}</div>
          </div>
        </div>

        {state.commentaryKey && (
          <div className="mt-2.5 rounded-2xl border-[1.5px] border-[#cfe9f3] bg-[#eaf6fb] px-3.5 py-2.5 text-sm font-bold">
            {COMMENT_COPY[state.commentaryKey]}
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <div className="bg-card shadow-[0_2px_0_var(--color-line)] rounded-2xl p-3">
          <div className="text-sub text-[10px] font-bold uppercase">Cash</div>
          <div className="font-bold">{formatMoney(state.cash)}</div>
        </div>
        <div className="bg-card shadow-[0_2px_0_var(--color-line)] rounded-2xl p-3">
          <div className="text-sub text-[10px] font-bold uppercase">Position</div>
          <div className="font-bold">
            {state.shares.toFixed(2)} sh ({formatMoney(state.shares * currentPrice(state))})
          </div>
        </div>
        <div className="bg-card shadow-[0_2px_0_var(--color-line)] rounded-2xl p-3">
          <div className="text-sub text-[10px] font-bold uppercase">Vs Bogle NPC</div>
          <div className={`font-bold ${gap >= 0 ? "text-up" : "text-down"}`}>
            {gap >= 0 ? "+" : ""}
            {gap.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap justify-end gap-2.5">
        <button
          type="button"
          onClick={() => setSheet("settings")}
          className="border-line h-9 w-9 rounded-full border-[1.5px] bg-white text-sm"
          title="Realism settings"
        >
          {"⚙"}
        </button>
        <button
          type="button"
          onClick={() => setSheet("data")}
          className="border-line rounded-full border-[1.5px] bg-white px-5 py-3 text-sm font-bold"
        >
          + Data
        </button>
        <button
          type="button"
          onClick={() => setSheet("trade")}
          className="bg-up rounded-full px-5 py-3 text-sm font-bold text-white"
        >
          Trade
        </button>
      </div>

      <div className="bg-card shadow-[0_2px_0_var(--color-line)] rounded-card p-5 text-center">
        <button
          type="button"
          disabled={!cashOutReady}
          onClick={() => dispatch({ type: "CASH_OUT" })}
          className="border-accent text-accent w-full rounded-full border-[1.5px] bg-white py-4 text-base font-bold disabled:opacity-40"
        >
          {cashOutReady ? "Cash out now" : `Cash out (unlocks day ${MIN_SCORING_DAYS})`}
        </button>
      </div>

      {sheet === "trade" && (
        <TradeSheet state={state} dispatch={dispatch} onClose={() => setSheet(null)} />
      )}
      {sheet === "data" && (
        <AddDataSheet state={state} dispatch={dispatch} onClose={() => setSheet(null)} />
      )}
      {sheet === "settings" && (
        <SettingsSheet state={state} dispatch={dispatch} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
