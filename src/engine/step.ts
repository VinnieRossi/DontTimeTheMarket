import { nasdaq, MAX_START_DAY, MIN_START_DAY, SERIES_LENGTH } from "@/data/marketData";
import { maybeUpdateCommentary } from "./comments";
import { processDividends } from "./dividends";
import { processInterest } from "./interest";
import { updateMomentum } from "./momentum";
import { BOGLE_NPC_ID, createInitialNpcs } from "./npc";
import { processPendingOrders } from "./orders";
import { nextInt } from "./rng";
import { edgeBpsVs, elapsedDays, playerValue } from "./selectors";
import {
  DEFAULT_INDICATORS,
  DEFAULT_SETTINGS,
  MIN_SCORING_DAYS,
  RUN_LENGTH_DAYS,
  STARTING_CASH,
  type Action,
  type GameState,
} from "./types";

function startRun(seed: number, runLength: GameState["runLength"]): GameState {
  const span = MAX_START_DAY - MIN_START_DAY;
  const draw = nextInt(seed, span);
  const startDay = MIN_START_DAY + draw.value;

  return {
    phase: "running",
    seed,
    rngState: draw.state,
    runLength,
    horizonDays: RUN_LENGTH_DAYS[runLength],
    startDay,
    day: startDay,
    cash: STARTING_CASH,
    shares: 0,
    lots: [],
    pending: [],
    nextOrderId: 1,
    npcs: createInitialNpcs(startDay),
    settings: DEFAULT_SETTINGS,
    indicators: DEFAULT_INDICATORS,
    momentum: { avgGain: 0, avgLoss: 0, ema12: null, ema26: null, signalEma: null },
    tradeLog: [],
    valueHistory: [
      {
        day: startDay,
        playerValue: STARTING_CASH,
        npcValues: { [BOGLE_NPC_ID]: STARTING_CASH },
      },
    ],
    tradeCount: 0,
    taxPaid: 0,
    feesPaid: 0,
    peakValue: STARTING_CASH,
    maxDrawdownPct: 0,
    lastCommentDay: 0,
    commentaryKey: null,
    speed: "1x",
  };
}

function computeNpcValues(state: GameState): Record<string, number> {
  const price = nasdaq.close[state.day]!;
  const out: Record<string, number> = {};
  for (const npc of state.npcs) {
    out[npc.id] = npc.cash + npc.shares * price;
  }
  return out;
}

function tick(state: GameState): GameState {
  if (state.phase === "ended") return state;
  if (state.day + 1 >= SERIES_LENGTH) {
    return { ...state, phase: "ended" };
  }

  let next: GameState = { ...state, day: state.day + 1 };
  next = processPendingOrders(next);
  next = processDividends(next);
  next = processInterest(next);
  next = updateMomentum(next);

  const pv = playerValue(next);
  const peakValue = Math.max(next.peakValue, pv);
  const drawdown = (pv - peakValue) / peakValue;
  const maxDrawdownPct = Math.min(next.maxDrawdownPct, drawdown);

  next = {
    ...next,
    peakValue,
    maxDrawdownPct,
    valueHistory: [
      ...next.valueHistory,
      { day: next.day, playerValue: pv, npcValues: computeNpcValues(next) },
    ],
  };

  next = maybeUpdateCommentary(next);

  if (elapsedDays(next) >= next.horizonDays) {
    next = { ...next, phase: "ended" };
  }

  return next;
}

export function step(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START_RUN":
      return startRun(action.seed, action.runLength);

    case "TICK":
      return tick(state);

    case "SET_SPEED":
      return { ...state, speed: action.speed };

    case "PLACE_ORDER":
      return {
        ...state,
        nextOrderId: state.nextOrderId + 1,
        pending: [...state.pending, { ...action.order, id: state.nextOrderId }],
      };

    case "CANCEL_ORDER":
      return {
        ...state,
        pending: state.pending.filter((o) => o.id !== action.id),
      };

    case "SET_SETTING":
      return {
        ...state,
        settings: { ...state.settings, [action.key]: action.value },
      };

    case "SET_INDICATOR":
      return {
        ...state,
        indicators: { ...state.indicators, [action.key]: action.value },
      };

    case "CASH_OUT": {
      if (elapsedDays(state) < MIN_SCORING_DAYS) return state;
      return { ...state, phase: "ended" };
    }

    case "CONTINUE": {
      const canContinue =
        state.phase === "ended" &&
        edgeBpsVs(state, BOGLE_NPC_ID) >= 0 &&
        state.day + RUN_LENGTH_DAYS[state.runLength] < SERIES_LENGTH - 2;
      if (!canContinue) return state;
      return {
        ...state,
        phase: "running",
        horizonDays: state.horizonDays + RUN_LENGTH_DAYS[state.runLength],
      };
    }

    default:
      return state;
  }
}
