import {
  type Action,
  startRun as openIndexRun,
  type RunLength,
  type RunState,
  SPEED_MS,
  step,
} from '@dttm/engine'
import { useCallback, useEffect, useReducer } from 'react'
import { drawSeed } from './seed'

/**
 * The two actions that are not the engine's. Going back to the start screen is navigation, and
 * handing over an already-opened run is how a portfolio run arrives: opening one reads the
 * company roster, and the roster is deliberately not in this package's import graph, so the
 * composition that did read it hands the opened run in rather than asking for one.
 */
type GameAction = Action | { type: 'RESET' } | { type: 'OPEN_RUN'; state: RunState }

function reducer(state: RunState | null, action: GameAction): RunState | null {
  if (action.type === 'RESET') return null
  if (action.type === 'OPEN_RUN') return action.state
  if (action.type === 'START_RUN') return openIndexRun(action.seed, action.runLength)
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
  state: RunState | null
  dispatch: (action: GameAction) => void
  /** Opens an index run, drawing the seed here. */
  startRun: (runLength: RunLength) => void
  /** Takes over a run that was opened elsewhere, which is how a portfolio run starts. */
  openRun: (run: RunState) => void
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
      dispatch({ type: 'START_RUN', seed: createSeed?.() ?? drawSeed(), runLength })
    },
    [createSeed]
  )

  const openRun = useCallback((run: RunState) => dispatch({ type: 'OPEN_RUN', state: run }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return { state, dispatch, startRun, openRun, reset }
}
