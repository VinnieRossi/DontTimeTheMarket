"use client";

import { useCallback, useEffect, useReducer } from "react";
import { step } from "./step";
import { SPEED_MS, type Action, type GameState } from "./types";

type HookAction = Action | { type: "RESET" };

function reducer(state: GameState | null, action: HookAction): GameState | null {
  if (action.type === "RESET") return null;
  if (state === null && action.type !== "START_RUN") return state;
  return step((state ?? ({} as GameState)) as GameState, action);
}

/**
 * Owns a GameState via the pure step() reducer and drives TICK on an
 * interval derived from state.speed. The interval timer lives here, in
 * the UI layer, specifically so the engine itself stays free of any
 * clock - step() never schedules anything, it only reacts to a TICK
 * action handed to it from outside. RESET is a UI-only navigation
 * action (go back to the start screen) and is never passed to step().
 */
export function useGame() {
  const [state, dispatch] = useReducer(reducer, null);
  const phase = state?.phase;
  const speed = state?.speed;

  useEffect(() => {
    if (!phase || phase !== "running" || !speed || speed === "paused") {
      return;
    }
    const ms = SPEED_MS[speed];
    const id = setInterval(() => {
      dispatch({ type: "TICK" });
    }, ms);
    return () => clearInterval(id);
  }, [phase, speed]);

  const startRun = useCallback((runLength: GameState["runLength"]) => {
    // The fresh seed for a brand-new run is the one place the UI layer
    // reaches for real entropy; everything after this point is driven
    // deterministically by step() from that seed.
    const seed = Math.floor(Math.random() * 0xffffffff);
    dispatch({ type: "START_RUN", seed, runLength });
  }, []);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return { state, dispatch, startRun, reset };
}
