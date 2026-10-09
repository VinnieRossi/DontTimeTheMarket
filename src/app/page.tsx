"use client";

import { EndScreen } from "@/components/EndScreen";
import { GameScreen } from "@/components/GameScreen";
import { StartScreen } from "@/components/StartScreen";
import { useGame } from "@/engine/useGame";

export default function HomePage() {
  const { state, dispatch, startRun, reset } = useGame();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <span className="font-display text-accent text-lg font-bold">
          Don&apos;t Time The Market
        </span>
      </header>

      {!state && <StartScreen onStart={startRun} />}
      {state && state.phase === "running" && (
        <GameScreen state={state} dispatch={dispatch} />
      )}
      {state && state.phase === "ended" && (
        <EndScreen state={state} dispatch={dispatch} onPlayAgain={reset} />
      )}
    </div>
  );
}
