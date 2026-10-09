/**
 * The realism switches. Each one makes the simulation harsher and more honest, and each one can
 * be turned off mid-run, because the point of the game is to let somebody find out what fees and
 * tax actually cost them rather than to hide it.
 */
export interface RealismSettings {
  fees: boolean
  tax: boolean
  interest: boolean
  reinvestDividends: boolean
}

export const DEFAULT_SETTINGS: RealismSettings = {
  fees: true,
  tax: true,
  interest: true,
  reinvestDividends: false,
}
