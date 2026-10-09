import { nasdaq } from "@/data/marketData";
import { STARTING_CASH, type NpcState } from "./types";

export const BOGLE_NPC_ID = "bogle";

/**
 * The engine models every benchmark opponent as a generic NPC: a starting
 * allocation bought once on day one, held forever, with every dividend
 * automatically reinvested. Adding a second NPC later (a different named
 * benchmark) only means adding another entry to this list; nothing in
 * the step function is specific to a particular NPC's identity.
 *
 * The one NPC shipped in this build is the Bogle NPC: a disciplined,
 * un-marketed stand-in for simply buying and holding the index. Per the
 * captain's instruction, this is presented plainly as a benchmark, not a
 * "ghost" character or mascot.
 */
export function createInitialNpcs(startDay: number): NpcState[] {
  const price = nasdaq.close[startDay];
  if (price === undefined) {
    throw new Error(`No price data at day index ${startDay}`);
  }
  return [
    {
      id: BOGLE_NPC_ID,
      name: "Bogle NPC",
      cash: 0,
      shares: STARTING_CASH / price,
    },
  ];
}
