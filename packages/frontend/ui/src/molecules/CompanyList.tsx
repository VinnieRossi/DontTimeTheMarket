import { ToggleChip } from '../atoms/ToggleChip'
import type { ChoiceView } from '../domain/game-view'
import type { CompanyCardView } from '../domain/portfolio-view'
import { cn } from '../lib/cn'

export interface CompanyListProps {
  companies: readonly CompanyCardView[]
  /** The groupings the list can be narrowed to, with the one in force. */
  groups: readonly ChoiceView[]
  currentGroup: string
  /** What to say when the chosen grouping holds nothing. */
  emptyNote: string
  className?: string | undefined
  onSelectGroup: (value: string) => void
  onToggleCompany: (assetId: string) => void
  /** Opens the full panel for one company, which is where its trends live. */
  onOpenCompany: (assetId: string) => void
}

/**
 * The roster, browsable by grouping and selectable by tapping.
 *
 * Each card shows a generated name and ticker over a truthful sector, industry, size bucket,
 * yield, and volatility. That split is the whole point of the screen: a player is meant to be able
 * to reason about the company and unable to recognize it.
 */
export function CompanyList({
  companies,
  groups,
  currentGroup,
  emptyNote,
  className,
  onSelectGroup,
  onToggleCompany,
  onOpenCompany,
}: CompanyListProps) {
  return (
    <div className={cn('app-roster', className)}>
      <div className="app-row app-row--tight app-roster__groups">
        {groups.map((group) => (
          <ToggleChip
            key={group.value}
            selected={group.value === currentGroup}
            onSelect={() => onSelectGroup(group.value)}
          >
            {group.label}
          </ToggleChip>
        ))}
      </div>

      {companies.length === 0 ? (
        <p className="app-text-muted app-roster__empty">{emptyNote}</p>
      ) : (
        <ul className="app-roster__grid">
          {companies.map((company) => (
            <li key={company.assetId}>
              <div className={cn('app-company', company.selected && 'app-company--selected')}>
                <button
                  type="button"
                  className="app-company__pick app-focusable"
                  aria-pressed={company.selected}
                  onClick={() => onToggleCompany(company.assetId)}
                >
                  <span className="app-company__ticker">{company.ticker}</span>
                  <span className="app-company__name">{company.name}</span>
                  <span className="app-company__where">
                    {company.sector} {'·'} {company.industry}
                  </span>
                  <span className="app-company__tags">
                    {company.tags.map((tag) => (
                      <span key={tag} className="app-tag">
                        {tag}
                      </span>
                    ))}
                  </span>
                </button>
                <button
                  type="button"
                  className="app-company__more app-focusable"
                  aria-label={`Details for ${company.ticker}`}
                  onClick={() => onOpenCompany(company.assetId)}
                >
                  Details
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
