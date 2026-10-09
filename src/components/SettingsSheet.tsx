"use client";

import type { Action, GameState, RealismSettings } from "@/engine/types";

const TOGGLES: { key: keyof RealismSettings; label: string }[] = [
  { key: "fees", label: "Trading fees & spread (3 bps)" },
  { key: "tax", label: "Capital gains tax" },
  { key: "interest", label: "Interest on idle cash" },
  { key: "reinvestDividends", label: "Auto-reinvest my dividends" },
];

export function SettingsSheet({
  state,
  dispatch,
  onClose,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(19,34,53,.4)]" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-[22px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-line mx-auto mb-4 h-1 w-10 rounded-full" />
        <h3 className="font-display text-lg font-bold">Realism settings</h3>
        {TOGGLES.map((t) => {
          const on = state.settings[t.key];
          return (
            <div
              key={t.key}
              className="border-line flex items-center justify-between border-b py-2.5 text-sm"
            >
              <span>{t.label}</span>
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "SET_SETTING", key: t.key, value: !on })
                }
                className={`relative h-6 w-[42px] flex-shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-line"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-5" : "left-0.5"}`}
                />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onClose}
          className="bg-accent shadow-[0_4px_0_#0a5f82] mt-4 w-full rounded-full py-3.5 text-sm font-bold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
