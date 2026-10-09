import nasdaqRaw from "../../data/baked/nasdaq.json";
import macroRaw from "../../data/baked/macro.json";

export interface NasdaqData {
  dates: string[];
  close: number[];
}

export interface MacroData {
  cpi: number[];
  dgs10: number[];
  dgs2: number[];
  dtb3: number[];
  fedFunds: number[];
  unemployment: number[];
  vix: number[];
  m2: number[];
}

export const nasdaq = nasdaqRaw as NasdaqData;
export const macro = macroRaw as MacroData;

export const SERIES_LENGTH = nasdaq.close.length;

/** How many trailing days must remain after a run's start day so that the
 * longest run length (2,520 days) plus a Continue extension of the same
 * length always has room, without ever reading past the end of the
 * baked array. */
const TRAILING_MARGIN_DAYS = 2520 * 2 + 30;

/** The latest valid absolute index a run may start at. */
export const MAX_START_DAY = SERIES_LENGTH - TRAILING_MARGIN_DAYS;
export const MIN_START_DAY = 30;
