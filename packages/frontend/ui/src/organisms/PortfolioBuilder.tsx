import { Button } from '../atoms/Button'
import { ToggleChip } from '../atoms/ToggleChip'
import type { ActionView, ChoiceView } from '../domain/game-view'
import type { AllocationRowView, CompanyCardView, HallOfFameView } from '../domain/portfolio-view'
import { AllocationList } from '../molecules/AllocationList'
import { Card } from '../molecules/Card'
import { CompanyList } from '../molecules/CompanyList'

export interface PortfolioBuilderProps {
  heading: string
  lede: string
  companies: readonly CompanyCardView[]
  groups: readonly ChoiceView[]
  currentGroup: string
  emptyNote: string
  runLengths: readonly ChoiceView[]
  selectedRunLength: string
  allocations: readonly AllocationRowView[]
  allocationTotal: string
  allocationComplete: boolean
  /** What the allocation list says before anything has been picked. */
  allocationPrompt: string
  start: ActionView
  /** The disclosure that the roster only holds companies that are still around. */
  survivorshipNote: string
  hallOfFameHeading: string
  hallOfFame: readonly HallOfFameView[]
  hallOfFameNote: string
  onSelectGroup: (value: string) => void
  onToggleCompany: (assetId: string) => void
  onOpenCompany: (assetId: string) => void
  onSelectRunLength: (value: string) => void
  onIncrease: (assetId: string) => void
  onDecrease: (assetId: string) => void
  onSplitEvenly: () => void
  onStart: () => void
  onBack: () => void
}

/**
 * The screen a portfolio run is built on: pick companies, split the money between them, start.
 *
 * The allocation list only appears once something has been picked, so the screen opens as one
 * thing to do rather than three. The start button is the only committing action and it is off
 * until the percentages hold all of the money, which means there is no invalid portfolio to
 * submit.
 */
export function PortfolioBuilder({
  heading,
  lede,
  companies,
  groups,
  currentGroup,
  emptyNote,
  runLengths,
  selectedRunLength,
  allocations,
  allocationTotal,
  allocationComplete,
  allocationPrompt,
  start,
  survivorshipNote,
  hallOfFameHeading,
  hallOfFame,
  hallOfFameNote,
  onSelectGroup,
  onToggleCompany,
  onOpenCompany,
  onSelectRunLength,
  onIncrease,
  onDecrease,
  onSplitEvenly,
  onStart,
  onBack,
}: PortfolioBuilderProps) {
  return (
    <div className="app-screen-stack">
      <Card roomy>
        <h1 className="app-heading app-heading--lg">{heading}</h1>
        <p className="app-text-muted app-start__lede">{lede}</p>

        <div className="app-start__group">
          <h2 className="app-start__group-title">Companies</h2>
          <CompanyList
            companies={companies}
            groups={groups}
            currentGroup={currentGroup}
            emptyNote={emptyNote}
            onSelectGroup={onSelectGroup}
            onToggleCompany={onToggleCompany}
            onOpenCompany={onOpenCompany}
          />
        </div>

        <div className="app-start__group">
          <h2 className="app-start__group-title">Allocation</h2>
          {allocations.length === 0 ? (
            <p className="app-text-muted">{allocationPrompt}</p>
          ) : (
            <>
              <AllocationList
                rows={allocations}
                total={allocationTotal}
                complete={allocationComplete}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
              />
              <div className="app-row app-row--tight">
                <ToggleChip size="md" selected={false} onSelect={onSplitEvenly}>
                  Split evenly
                </ToggleChip>
              </div>
            </>
          )}
        </div>

        <div className="app-start__group">
          <h2 className="app-start__group-title">Run length</h2>
          <div className="app-row app-row--tight">
            {runLengths.map((option) => (
              <ToggleChip
                key={option.value}
                size="md"
                selected={option.value === selectedRunLength}
                onSelect={() => onSelectRunLength(option.value)}
              >
                {option.label}
              </ToggleChip>
            ))}
          </div>
        </div>

        <div className="app-start__action">
          <Button size="lg" fullWidth disabled={!start.enabled} onClick={onStart}>
            {start.label}
          </Button>
        </div>
      </Card>

      <p className="app-start__footnote">{survivorshipNote}</p>

      <Card>
        <h2 className="app-heading app-heading--sm">{hallOfFameHeading}</h2>
        <p className="app-text-muted app-start__lede">{hallOfFameNote}</p>
        <ul className="app-hof">
          {hallOfFame.map((entry) => (
            <li key={entry.name} className="app-hof__item">
              <span className="app-hof__name">{entry.name}</span>
              <span className="app-hof__note">{entry.note}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Button variant="secondary" size="lg" fullWidth onClick={onBack}>
        Back
      </Button>
    </div>
  )
}
