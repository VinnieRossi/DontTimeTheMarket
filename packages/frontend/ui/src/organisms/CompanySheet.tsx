import { Button } from '../atoms/Button'
import { Sparkline } from '../atoms/Sparkline'
import { Stat } from '../atoms/Stat'
import type { ActionView } from '../domain/game-view'
import type { CompanyDetailView } from '../domain/portfolio-view'
import { BottomSheet } from '../molecules/BottomSheet'

export interface CompanySheetProps {
  company: CompanyDetailView
  /** What the committing action is: picking the company, or buying into it mid-run. */
  action: ActionView
  onAct: () => void
  onClose: () => void
}

/**
 * Everything a player is allowed to know about one company.
 *
 * The trends are drawn as shapes with a sentence each and no figures, which is deliberate: a
 * recognizable revenue number would identify the company outright and the lesson the panel is
 * teaching is about the direction of travel rather than the size of the business.
 */
export function CompanySheet({ company, action, onAct, onClose }: CompanySheetProps) {
  return (
    <BottomSheet
      title={`${company.ticker} - ${company.name}`}
      lede={`${company.sector} · ${company.industry}`}
      onClose={onClose}
      footer={
        <>
          <Button fullWidth disabled={!action.enabled} onClick={onAct}>
            {action.label}
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="app-company-stats app-sheet__block">
        {company.stats.map((stat) => (
          <Stat key={stat.label} surface="sunken" label={stat.label} value={stat.value} />
        ))}
      </div>

      {company.trends.length > 0 && (
        <div className="app-sheet__group">
          <div className="app-sheet__group-title">Fundamentals, as trends</div>
          <ul className="app-trends">
            {company.trends.map((trend) => (
              <li key={trend.label} className="app-trend">
                <span className="app-trend__label">{trend.label}</span>
                <Sparkline points={trend.points} label={`${trend.label} trend`} tone="neutral" />
                <span className="app-trend__caption">{trend.caption}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="app-sheet__group">
        <div className="app-sheet__group-title">Analyst note</div>
        <p className="app-note">{company.note}</p>
      </div>
    </BottomSheet>
  )
}
