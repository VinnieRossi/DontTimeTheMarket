"use client";

import { useState } from "react";
import type { Action, GameState, OrderType } from "@/engine/types";
import { currentPrice } from "@/engine/selectors";

const SIZE_PRESETS = [10, 25, 50, 100];

export function TradeSheet({
  state,
  dispatch,
  onClose,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [buyPct, setBuyPct] = useState(25);
  const [sellPct, setSellPct] = useState(100);
  const [buyOrderType, setBuyOrderType] = useState<OrderType>("market");
  const [sellOrderType, setSellOrderType] = useState<OrderType>("market");
  const [buyLimit, setBuyLimit] = useState("");
  const [sellTrigger, setSellTrigger] = useState("");

  const price = currentPrice(state);

  function submitBuy() {
    const amountUsd = state.cash * (buyPct / 100);
    dispatch({
      type: "PLACE_ORDER",
      order: {
        side: "buy",
        orderType: buyOrderType,
        amountUsd,
        targetPrice:
          buyOrderType === "market" ? undefined : Number(buyLimit) || price,
      },
    });
    onClose();
  }

  function submitSell() {
    const qty = state.shares * (sellPct / 100);
    dispatch({
      type: "PLACE_ORDER",
      order: {
        side: "sell",
        orderType: sellOrderType,
        qty,
        targetPrice:
          sellOrderType === "market" ? undefined : Number(sellTrigger) || price,
      },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(19,34,53,.4)]" onClick={onClose}>
      <div
        className="bg-card flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[22px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="bg-line mx-auto mb-4 h-1 w-10 rounded-full" />
        <h3 className="font-display text-lg font-bold">Trade</h3>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("buy")}
            className={`flex-1 rounded-full border-[1.5px] py-2.5 text-sm font-bold ${tab === "buy" ? "border-accent bg-accent text-white" : "border-line bg-white text-sub"}`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setTab("sell")}
            className={`flex-1 rounded-full border-[1.5px] py-2.5 text-sm font-bold ${tab === "sell" ? "border-accent bg-accent text-white" : "border-line bg-white text-sub"}`}
          >
            Sell
          </button>
        </div>

        {tab === "buy" ? (
          <div>
            <p className="text-sub mt-3 text-sm">Spends a percentage of your free cash.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SIZE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBuyPct(p)}
                  className="border-line rounded-full border-[1.5px] bg-white px-3 py-1.5 text-xs font-bold"
                >
                  {p}%
                </button>
              ))}
            </div>
            <label className="text-sub mt-2 block text-xs font-bold">% of cash</label>
            <input
              type="number"
              value={buyPct}
              min={1}
              max={100}
              onChange={(e) => setBuyPct(Number(e.target.value))}
              className="border-line mt-1 w-full rounded-xl border-[1.5px] px-3 py-2.5 text-sm"
            />
            <label className="text-sub mt-2 block text-xs font-bold">Order type</label>
            <select
              value={buyOrderType}
              onChange={(e) => setBuyOrderType(e.target.value as OrderType)}
              className="border-line mt-1 w-full rounded-xl border-[1.5px] bg-white px-3 py-2.5 text-sm"
            >
              <option value="market">Market</option>
              <option value="limit">Limit (buy if price falls to...)</option>
            </select>
            {buyOrderType !== "market" && (
              <input
                type="number"
                placeholder="Limit price"
                value={buyLimit}
                onChange={(e) => setBuyLimit(e.target.value)}
                className="border-line mt-2 w-full rounded-xl border-[1.5px] px-3 py-2.5 text-sm"
              />
            )}
          </div>
        ) : (
          <div>
            <p className="text-sub mt-3 text-sm">Liquidates a percentage of your current position.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[25, 50, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSellPct(p)}
                  className="border-line rounded-full border-[1.5px] bg-white px-3 py-1.5 text-xs font-bold"
                >
                  {p}%
                </button>
              ))}
            </div>
            <label className="text-sub mt-2 block text-xs font-bold">% of position</label>
            <input
              type="number"
              value={sellPct}
              min={1}
              max={100}
              onChange={(e) => setSellPct(Number(e.target.value))}
              className="border-line mt-1 w-full rounded-xl border-[1.5px] px-3 py-2.5 text-sm"
            />
            <label className="text-sub mt-2 block text-xs font-bold">Order type</label>
            <select
              value={sellOrderType}
              onChange={(e) => setSellOrderType(e.target.value as OrderType)}
              className="border-line mt-1 w-full rounded-xl border-[1.5px] bg-white px-3 py-2.5 text-sm"
            >
              <option value="market">Market</option>
              <option value="stop">Stop-loss (sell if price falls to...)</option>
              <option value="takeProfit">Take-profit (sell if price rises to...)</option>
            </select>
            {sellOrderType !== "market" && (
              <input
                type="number"
                placeholder="Trigger price"
                value={sellTrigger}
                onChange={(e) => setSellTrigger(e.target.value)}
                className="border-line mt-2 w-full rounded-xl border-[1.5px] px-3 py-2.5 text-sm"
              />
            )}
          </div>
        )}

        {state.pending.length > 0 && (
          <div className="mt-4">
            <div className="text-sub mb-1 text-xs font-bold tracking-wide uppercase">
              Pending
            </div>
            {state.pending.map((o) => (
              <div
                key={o.id}
                className="border-line flex items-center justify-between border-b py-2 text-sm"
              >
                <span>
                  {o.side} {o.orderType === "market" ? "market" : `${o.orderType} @ ${o.targetPrice?.toFixed(2)}`}
                </span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "CANCEL_ORDER", id: o.id })}
                  className="bg-line rounded-full px-2.5 py-1 text-xs"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        </div>

        <div className="border-line shrink-0 border-t px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={tab === "buy" ? submitBuy : submitSell}
            className={`block w-full rounded-full py-3.5 text-sm font-bold text-white ${tab === "buy" ? "bg-up" : "bg-down"}`}
          >
            {tab === "buy" ? "Buy" : "Sell"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border-accent text-accent mt-2.5 block w-full rounded-full border-[1.5px] bg-white py-3.5 text-sm font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
