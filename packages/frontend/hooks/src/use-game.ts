import {
  type Action,
  type GameState,
  startRun as openRun,
  type RunLength,
  SPEED_MS,
  step,
} from '@dttm/engine'
import { useCallback, useEffect, useReducer } from 'react'

/**
 * The only action that is not the engine's. Going back to the start screen is navigation rather
 * than something that happens inside a run, so it never reaches `step`.
 */
type GameAction = Action | { type: 'RESET' }

function reducer(state: GameState | null, action: GameAction): GameState | null {
  if (action.type === 'RESET') return null
  if (action.type === 'START_RUN') return openRun(action.seed, action.runLength)
  if (state === null) return null
  return step(state, action)
}

export interface UseGameOptions {
  /**
   * Where the seed for a new run comes from. It is injectable for one reason: a test that cannot
   * name the seed cannot reproduce the run it just failed on.
   */
  createSeed?: () => number
}

export interface UseGameResult {
  state: GameState | null
  dispatch: (action: GameAction) => void
  startRun: (runLength: RunLength) => void
  reset: () => void
}

/**
 * Holds a run and drives it. The clock lives here, in the React layer, precisely so the engine
 * has none: `step` never schedules anything, it only answers a tick handed to it from outside.
 * That is what keeps a run reproducible from its seed and its action log.
 */
export function useGame(options: UseGameOptions = {}): UseGameResult {
  const [state, dispatch] = useReducer(reducer, null)
  const phase = state?.phase
  const speed = state?.speed
  const createSeed = options.createSeed

  useEffect(() => {
    if (phase !== 'running' || speed === undefined || speed === 'paused') return
    const timer = setInterval(() => dispatch({ type: 'TICK' }), SPEED_MS[speed])
    return () => clearInterval(timer)
  }, [phase, speed])

  const startRun = useCallback(
    (runLength: RunLength) => {
      /*
       * The one place anything here reaches for real entropy. Everything after this point is
       * driven deterministically by the engine from the seed drawn now.
       */
      const seed = createSeed?.() ?? Math.floor(Math.random() * 0xffffffff)
      dispatch({ type: 'START_RUN', seed, runLength })
    },
    [createSeed]
  )

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return { state, dispatch, startRun, reset }
}
