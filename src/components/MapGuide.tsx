import { CATEGORY_MAP } from '../data/categories'
import { useI18n } from '../i18n'
import type { CategoryId, Report } from '../types'

type Props = {
  reports: Report[]
  active: Set<CategoryId> | 'all'
  onToggle: (id: CategoryId) => void
  onClearFilter: () => void
  onGoReport: () => void
}

export function MapGuide({ reports, active, onToggle, onClearFilter, onGoReport }: Props) {
  const { t } = useI18n()

  const present = Array.from(
    new Set(reports.filter((r) => !r.hidden).map((r) => r.category)),
  ) as CategoryId[]

  const counts = new Map<CategoryId, number>()
  for (const r of reports) {
    if (r.hidden) continue
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  }

  const filtering = active !== 'all'

  return (
    <aside className="map-guide panel">
      <p className="kicker">{t.map.kicker}</p>
      <h2 className="map-guide-title">{t.map.howTitle}</h2>
      <p className="map-guide-copy">{t.map.howBody}</p>
      <button type="button" className="secondary map-guide-cta" onClick={onGoReport}>
        {t.map.goReport}
      </button>

      {present.length === 0 ? (
        <p className="hint map-guide-empty">{t.map.emptyMap}</p>
      ) : (
        <div className="map-guide-cats">
          <div className="map-guide-cats-head">
            <h3>{t.map.onThisMap}</h3>
            {filtering ? (
              <button type="button" className="linkish" onClick={onClearFilter}>
                {t.map.clearFilter}
              </button>
            ) : null}
          </div>
          <ul>
            {present.map((id) => {
              const on = active === 'all' || (active instanceof Set && active.has(id))
              const meta = CATEGORY_MAP[id]
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`legend-item ${on ? 'on' : 'off'}`}
                    onClick={() => onToggle(id)}
                  >
                    <span className="swatch" style={{ background: meta.color }} />
                    <span className="legend-label">
                      {t.categories[meta.labelKey as keyof typeof t.categories]}
                    </span>
                    <span className="legend-count">{counts.get(id) ?? 0}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="hint">{t.map.heatNote}</p>
        </div>
      )}
    </aside>
  )
}
