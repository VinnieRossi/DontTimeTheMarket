import { Button } from '../atoms/Button'
import { Switch } from '../atoms/Switch'
import type { SwitchItemView } from '../domain/game-view'
import { BottomSheet } from '../molecules/BottomSheet'

export interface SettingsSheetProps {
  switches: readonly SwitchItemView[]
  onToggle: (key: string, checked: boolean) => void
  onClose: () => void
}

/** The realism switches, each one a cost the player can decide to stop paying. */
export function SettingsSheet({ switches, onToggle, onClose }: SettingsSheetProps) {
  return (
    <BottomSheet
      title="Realism settings"
      onClose={onClose}
      footer={
        <Button fullWidth onClick={onClose}>
          Done
        </Button>
      }
    >
      {switches.map((item) => (
        <Switch
          key={item.key}
          label={item.label}
          checked={item.checked}
          onChange={(checked) => onToggle(item.key, checked)}
        />
      ))}
    </BottomSheet>
  )
}
