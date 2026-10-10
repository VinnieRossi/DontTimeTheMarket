import { closeAt } from './market-data'
import { STARTING_CASH } from './rules'
import type { NpcState } from './state'

export const BOGLE_NPC_ID = 'bogle'
export const BOGLE_NPC_NAME = 'Bogle NPC'

/**
 * The engine models every benchmark opponent as a generic NPC: a starting allocation bought once
 * on day one, held forever, with every dividend automatically reinvested. Adding a second
 * benchmark later only means adding another entry to this list; nothing in the step function is
 * specific to a particular NPC's identity.
 *
 * The one NPC shipped in this build is the Bogle NPC: a disciplined, un-marketed stand-in for
 * simply buying and holding, presented plainly as a benchmark rather than as a mascot. In a
 * portfolio run it holds the player's own opening basket rather than a generic one, so the two of
 * them start from the identical allocation decision and the only thing that separates the lines
 * afterward is what the player did next.
 */
export function createInitialNpcs(startDay: number): NpcState[] {
  return [
    {
      id: BOGLE_NPC_ID,
      name: BOGLE_NPC_NAME,
      cash: 0,
      shares: STARTING_CASH / closeAt(startDay),
    },
  ]
}
