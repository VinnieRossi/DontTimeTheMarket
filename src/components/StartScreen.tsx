"use client";

import { useState } from "react";
import type { RunLength } from "@/engine/types";

const RUN_LENGTHS: { key: RunLength; label: string }[] = [
  { key: "short", label: "Short - 1 year" },
  { key: "standard", label: "Standard - 3 years" },
  { key: "long", label: "Long - 10 years" },
];

export function StartScreen({
  onStart,
}: {
  onStart: (runLength: RunLength) => void;
}) {
  const [runLength, setRunLength] = useState<RunLength>("standard");

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="rounded-card bg-card shadow-[0_2px_0_var(--color-line),0_16px_32px_-20px_rgba(14,127,174,.35)] p-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Think you can beat the market?
        </h1>
        <p className="text-sub mt-2 text-sm leading-relaxed">
          Trade a real, randomized slice of market history. Calendar dates
          and price levels are hidden, so no peeking at &quot;oh, it&apos;s
          2008.&quot; At the end, we compare you to the Bogle NPC: a
          disciplined buy-and-hold benchmark that never panics and never
          skips a dividend.
        </p>

        <h2 className="font-display mt-6 text-lg font-bold">Run length</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {RUN_LENGTHS.map((rl) => (
            <button
              key={rl.key}
              type="button"
              onClick={() => setRunLength(rl.key)}
              className={`rounded-full border-[1.5px] px-4 py-2.5 text-sm font-bold transition-colors ${
                runLength === rl.key
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-white text-ink"
              }`}
            >
              {rl.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onStart(runLength)}
          className="bg-accent shadow-[0_4px_0_#0a5f82] mt-6 block w-full rounded-full px-4 py-4 text-base font-bold text-white"
        >
          Start run
        </button>
      </div>

      <p className="text-sub mt-4 text-center text-xs">
        Scores are not saved anywhere yet; this build is index mode only.
      </p>
    </div>
  );
}
