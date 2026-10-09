/**
 * What a screen needs to render, with nothing left to work out. Every figure arrives already
 * formatted and every state already decided, because a component that computed either would have
 * to know the simulation, and then it could not be rendered from a story.
 */

export interface ChoiceView {
  value: string
  label: string
}

export interface FigureView {
  label: string
  value: string
  /** Set only where the figure means a number went up or down. */
  direction?: 'up' | 'down'
}

export interface ActionView {
  label: string
  enabled: boolean
}

export interface IndicatorItemView {
  key: string
  label: string
  checked: boolean
}

export interface IndicatorTierView {
  name: string
  items: readonly IndicatorItemView[]
}

export interface SwitchItemView {
  key: string
  label: string
  checked: boolean
}
