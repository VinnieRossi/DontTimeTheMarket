"use client";

import { complexityLabel, indicatorChips } from "@/engine/indicatorDisplay";
import type { Action, GameState, IndicatorToggles } from "@/engine/types";

const TIERS: { name: string; items: { key: keyof IndicatorToggles; label: string }[] }[] = [
  {
    name: "Tier 1 - Chart stuff",
    items: [
      { key: "sma", label: "Moving averages (20/50)" },
      { key: "volume", label: "Volume" },
    ],
  },
  {
    name: "Tier 2 - Technicals",
    items: [
      { key: "rsi", label: "RSI (14)" },
      { key: "macd", label: "MACD" },
      { key: "bb", label: "Bollinger Bands" },
      { key: "atr", label: "ATR (volatility)" },
    ],
  },
  {
    name: "Tier 3 - Market-wide gauges",
    items: [
      { key: "vix", label: "Volatility index" },
      { key: "yieldCurve", label: "Yield curve (10y-2y)" },
    ],
  },
  {
    name: "Tier 4 - Macro overload",
    items: [
      { key: "cpi", label: "CPI (inflation)" },
      { key: "unemployment", label: "Unemployment rate" },
      { key: "fedFunds", label: "Fed funds rate" },
      { key: "m2", label: "M2 money supply" },
    ],
  },
];

export function AddDataSheet({
  state,
  dispatch,
  onClose,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
  onClose: () => void;
}) {
  const chipCount = indicatorChips(state).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(19,34,53,.4)]" onClick={onClose}>
      <div
        className="bg-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-[22px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-line mx-auto mb-4 h-1 w-10 rounded-full" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Add data</h3>
          <span className="bg-line text-sub rounded-full px-2.5 py-1 text-xs font-bold">
            {complexityLabel(chipCount)}
          </span>
        </div>
        <p className="text-sub mt-1 text-sm">
          Pile these on to see how far you can push it.
        </p>

        {TIERS.map((tier) => (
          <div key={tier.name} className="border-line mt-3.5 border-t pt-3.5">
            <div className="text-sub mb-2 text-xs font-bold tracking-wide uppercase">
              {tier.name}
            </div>
            {tier.items.map((item) => (
              <label key={item.key} className="flex items-center gap-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={state.indicators[item.key]}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_INDICATOR",
                      key: item.key,
                      value: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                {item.label}
              </label>
            ))}
          </div>
        ))}

        <button
          type="button"
          onClick={onClose}
          className="border-accent text-accent mt-4 w-full rounded-full border-[1.5px] bg-white py-3.5 text-sm font-bold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
