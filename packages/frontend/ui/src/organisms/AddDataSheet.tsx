import { Button } from '../atoms/Button'
import { Checkbox } from '../atoms/Checkbox'
import { StatusBadge } from '../atoms/StatusBadge'
import type { IndicatorTierView } from '../domain/game-view'
import { BottomSheet } from '../molecules/BottomSheet'

export interface AddDataSheetProps {
  tiers: readonly IndicatorTierView[]
  /** The joke label for how cluttered the screen has become. */
  complexity: string
  onToggle: (key: string, checked: boolean) => void
  onClose: () => void
}

/**
 * Everything a player can pile onto the chart, in tiers by how far it sits from the price. None
 * of it helps, which is the joke, so none of it is recommended or sorted by usefulness.
 */
export function AddDataSheet({ tiers, complexity, onToggle, onClose }: AddDataSheetProps) {
  return (
    <BottomSheet
      title="Add data"
      lede="Pile these on to see how far you can push it."
      badge={<StatusBadge>{complexity}</StatusBadge>}
      onClose={onClose}
      footer={
        <Button variant="secondary" fullWidth onClick={onClose}>
          Close
        </Button>
      }
    >
      {tiers.map((tier) => (
        <div key={tier.name} className="app-sheet__group">
          <div className="app-sheet__group-title">{tier.name}</div>
          {tier.items.map((item) => (
            <Checkbox
              key={item.key}
              id={`indicator-${item.key}`}
              label={item.label}
              checked={item.checked}
              onChange={(checked) => onToggle(item.key, checked)}
            />
          ))}
        </div>
      ))}
    </BottomSheet>
  )
}
