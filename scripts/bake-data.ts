/**
 * Build-time data bake script. Run manually with `npm run bake-data`.
 *
 * Fetches daily NASDAQ Composite prices and a handful of macro series from
 * FRED's public CSV endpoint (fred.stlouisfed.org/graph/fredgraph.csv),
 * which needs no API key and no account. Output is written to
 * data/baked/*.json and committed to the repo; the deployed app never
 * calls FRED at runtime. See report.md section 5 for the sourcing
 * rationale and the evidence that this endpoint is reachable without
 * a key.
 *
 * Re-run this script manually (e.g. quarterly) to refresh the baked data;
 * it is not wired into any CI job or runtime path.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve(import.meta.dirname, "..", "data", "baked");

const FRED_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv";

interface FredSeries {
  dates: string[];
  values: (number | null)[];
}

async function fetchFredSeries(id: string): Promise<FredSeries> {
  const url = `${FRED_BASE}?id=${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FRED fetch failed for ${id}: HTTP ${res.status}`);
  }
  const text = await res.text();
  const lines = text.trim().split("\n");
  // First line is a header: "observation_date,<SERIES_ID>"
  const dates: string[] = [];
  const values: (number | null)[] = [];
  for (const line of lines.slice(1)) {
    const [date, raw] = line.split(",");
    if (!date) continue;
    dates.push(date);
    values.push(raw === "." || raw === undefined ? null : Number(raw));
  }
  return { dates, values };
}

/**
 * Aligns a (possibly sparser, lower-frequency) macro series onto the
 * target daily date grid by forward-filling the last known value, and
 * back-filling any leading gap with the first known value. This is a
 * standard way to put monthly series (CPI, unemployment, Fed funds, M2)
 * and a series with a later start date (VIX, which only goes back to
 * 1990) onto the same daily index space as the NASDAQ price series,
 * so the engine can index every series by the same integer day offset.
 * Back-filling the lead-in for VIX specifically means days before 1990
 * show 1990's earliest reading rather than a gap; that is a deliberate,
 * disclosed simplification for a tongue-in-cheek educational game, not
 * a claim of historical accuracy before the series existed.
 */
function alignToGrid(
  targetDates: string[],
  source: FredSeries,
): (number | null)[] {
  const sourceMap = new Map<string, number>();
  for (let i = 0; i < source.dates.length; i++) {
    const v = source.values[i];
    if (v !== null && v !== undefined) {
      sourceMap.set(source.dates[i]!, v);
    }
  }
  const sourceDatesSorted = [...sourceMap.keys()].sort();
  const out: (number | null)[] = [];
  let lastKnown: number | null = null;
  let sourceIdx = 0;
  for (const d of targetDates) {
    while (
      sourceIdx < sourceDatesSorted.length &&
      sourceDatesSorted[sourceIdx]! <= d
    ) {
      lastKnown = sourceMap.get(sourceDatesSorted[sourceIdx]!)!;
      sourceIdx++;
    }
    out.push(lastKnown);
  }
  // Back-fill any leading nulls with the first known value.
  const firstKnownIdx = out.findIndex((v) => v !== null);
  if (firstKnownIdx > 0) {
    const firstKnown = out[firstKnownIdx]!;
    for (let i = 0; i < firstKnownIdx; i++) {
      out[i] = firstKnown;
    }
  }
  return out;
}

async function main() {
  console.log("Fetching NASDAQCOM (daily, since 1971)...");
  const nasdaq = await fetchFredSeries("NASDAQCOM");

  // FRED's NASDAQCOM feed turns out to carry two different kinds of gap,
  // not one: "." for an unscheduled missing observation (handled by the
  // v !== null check), and a literal 0 on market holidays that fall on a
  // weekday (verified against the US market holiday calendar: 1971-02-15
  // Washington's Birthday, 1971-04-09 Good Friday, 1971-09-06 Labor Day,
  // and 484 others like them across the full series). A holiday is not a
  // trading day with a real closing price of zero, so both kinds of gap
  // are dropped the same way; the engine assumes a dense array of real
  // trading days with no zero or negative prices.
  const dates: string[] = [];
  const close: number[] = [];
  for (let i = 0; i < nasdaq.dates.length; i++) {
    const v = nasdaq.values[i];
    if (v !== null && v !== undefined && v > 0) {
      dates.push(nasdaq.dates[i]!);
      close.push(v);
    }
  }
  console.log(`  -> ${dates.length} trading days, ${dates[0]} to ${dates[dates.length - 1]}`);

  const macroSeriesIds = {
    cpi: "CPIAUCSL",
    dgs10: "DGS10",
    dgs2: "DGS2",
    dtb3: "DTB3",
    fedFunds: "FEDFUNDS",
    unemployment: "UNRATE",
    vix: "VIXCLS",
    m2: "M2SL",
  } as const;

  const macro: Record<string, (number | null)[]> = {};
  for (const [key, id] of Object.entries(macroSeriesIds)) {
    console.log(`Fetching ${id}...`);
    const series = await fetchFredSeries(id);
    macro[key] = alignToGrid(dates, series);
    const nonNull = macro[key]!.filter((v) => v !== null).length;
    console.log(`  -> aligned to ${nonNull}/${dates.length} non-null days`);
  }

  await mkdir(OUT_DIR, { recursive: true });

  await writeFile(
    path.join(OUT_DIR, "nasdaq.json"),
    JSON.stringify({ dates, close }),
  );
  // No "dates" field here: every macro array aligns by index position to
  // nasdaq.json's dates/close arrays (same length, same order), so the
  // date strings do not need to be duplicated in this file.
  await writeFile(path.join(OUT_DIR, "macro.json"), JSON.stringify(macro));

  console.log(`Wrote baked data to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
