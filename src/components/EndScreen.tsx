"use client";

import { SERIES_LENGTH } from "@/data/marketData";
import { BOGLE_NPC_ID } from "@/engine/npc";
import { edgeBpsVs, playerValue } from "@/engine/selectors";
import {
  RUN_LENGTH_DAYS,
  STARTING_CASH,
  type Action,
  type GameState,
} from "@/engine/types";

function formatMoney(v: number): string {
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatBps(v: number): string {
  return `${v >= 0 ? "+" : ""}${Math.round(v)} bps`;
}

export function EndScreen({
  state,
  dispatch,
  onPlayAgain,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
  onPlayAgain: () => void;
}) {
  const edge = edgeBpsVs(state, BOGLE_NPC_ID);
  const won = edge >= 0;
  const hasRoom = state.day + RUN_LENGTH_DAYS[state.runLength] < SERIES_LENGTH - 2;

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="bg-card shadow-[0_2px_0_var(--color-line)] rounded-card p-6 text-center">
        <h2 className="font-display text-xl font-bold">
          {won ? "You beat the Bogle NPC" : "The Bogle NPC wins this one"}
        </h2>
        <div className={`font-display mt-2 text-4xl font-bold ${won ? "text-up" : "text-down"}`}>
          {formatBps(edge)}
        </div>
        <p className="text-sub mt-2 text-sm">
          {won
            ? "A small win over a short horizon happens more than you'd think. Keep going and the odds start working against you again."
            : "Most players lose to a patient buy-and-hold benchmark. You are now most players. There is some comfort in that, probably."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="bg-[#f7fbfd] rounded-xl p-3">
            <div className="text-sub text-[11px] font-bold uppercase">Total return</div>
            <div className="font-bold">
              {((playerValue(state) / STARTING_CASH - 1) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-[#f7fbfd] rounded-xl p-3">
            <div className="text-sub text-[11px] font-bold uppercase">Max drawdown</div>
            <div className="font-bold">{(state.maxDrawdownPct * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-[#f7fbfd] rounded-xl p-3">
            <div className="text-sub text-[11px] font-bold uppercase">Trades placed</div>
            <div className="font-bold">{state.tradeCount}</div>
          </div>
          <div className="bg-[#f7fbfd] rounded-xl p-3">
            <div className="text-sub text-[11px] font-bold uppercase">Tax + fees paid</div>
            <div className="font-bold">{formatMoney(state.taxPaid + state.feesPaid)}</div>
          </div>
        </div>

        <button
          type="button"
          disabled={!won || !hasRoom}
          onClick={() => dispatch({ type: "CONTINUE" })}
          className="bg-accent shadow-[0_4px_0_#0a5f82] mt-4 block w-full rounded-full py-4 text-sm font-bold text-white disabled:opacity-40"
        >
          {won
            ? hasRoom
              ? "Continue this run"
              : "Out of history to continue into"
            : "Continue (only available when winning)"}
        </button>
        <button
          type="button"
          onClick={onPlayAgain}
          className="border-accent text-accent mt-2.5 block w-full rounded-full border-[1.5px] bg-white py-4 text-sm font-bold"
        >
          Play a new run
        </button>
      </div>
    </div>
  );
}
