import { Button } from '../atoms/Button'
import { ToggleChip } from '../atoms/ToggleChip'
import { cn } from '../lib/cn'

export interface SpeedOption {
  value: string
  label: string
}

export interface SpeedControlsProps {
  options: readonly SpeedOption[]
  current: string
  /** Advances exactly one day, which is the only way to watch a single move happen. */
  onStep: () => void
  onSelect: (value: string) => void
  className?: string | undefined
}

/** How fast the market moves, plus a single step for when that is still too fast. */
export function SpeedControls({
  options,
  current,
  onStep,
  onSelect,
  className,
}: SpeedControlsProps) {
  return (
    <div className={cn('app-row', 'app-row--tight', className)}>
      {options.map((option) => (
        <ToggleChip
          key={option.value}
          selected={option.value === current}
          onSelect={() => onSelect(option.value)}
        >
          {option.label}
        </ToggleChip>
      ))}
      <Button variant="ghost" size="sm" onClick={onStep}>
        Step
      </Button>
    </div>
  )
}
