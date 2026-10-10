import { Button } from '../atoms/Button'
import type { ChoiceView } from '../domain/game-view'
import type { CompanyCardView } from '../domain/portfolio-view'
import { BottomSheet } from '../molecules/BottomSheet'
import { CompanyList } from '../molecules/CompanyList'

export interface CompanyPickerSheetProps {
  /** The whole universe, not only what is held, since this is how a new position is opened. */
  companies: readonly CompanyCardView[]
  groups: readonly ChoiceView[]
  currentGroup: string
  emptyNote: string
  lede: string
  onSelectGroup: (value: string) => void
  /** Reports the company to open a position in, which takes the player on to the trade panel. */
  onPick: (assetId: string) => void
  /** Reports a request to read one company's panel before deciding anything. */
  onOpenCompany: (assetId: string) => void
  onClose: () => void
}

/**
 * The sheet a new position is opened from, mid-run.
 *
 * It browses the same roster the builder does, by the same groupings, because a company bought on
 * day 400 should be chosen on exactly the same information a company bought on day one was.
 */
export function CompanyPickerSheet({
  companies,
  groups,
  currentGroup,
  emptyNote,
  lede,
  onSelectGroup,
  onPick,
  onOpenCompany,
  onClose,
}: CompanyPickerSheetProps) {
  return (
    <BottomSheet
      title="Buy a company"
      lede={lede}
      onClose={onClose}
      footer={
        <Button variant="secondary" fullWidth onClick={onClose}>
          Close
        </Button>
      }
    >
      <CompanyList
        className="app-sheet__block"
        companies={companies}
        groups={groups}
        currentGroup={currentGroup}
        emptyNote={emptyNote}
        onSelectGroup={onSelectGroup}
        onToggleCompany={onPick}
        onOpenCompany={onOpenCompany}
      />
    </BottomSheet>
  )
}
