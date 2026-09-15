import { CATEGORY_MAP } from '../data/categories'
import { useI18n } from '../i18n'
import { gridKey } from '../lib/grid'
import type { Report } from '../types'

type Props = {
  reports: Report[]
  petitionCount: number
  onPetition: () => void
  onClose: () => void
}

export function CellDetail({ reports, petitionCount, onPetition, onClose }: Props) {
  const { t } = useI18n()
  if (!reports.length) return null

  const key = gridKey(reports[0].grid_lat, reports[0].grid_lng)
  const byCat = new Map<string, number>()
  for (const r of reports) {
    byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1)
  }

  const publicOnes = reports.filter((r) => {
    const meta = CATEGORY_MAP[r.category]
    return meta.publicText && !meta.countOnly && !r.involves_minor && (r.what_happened || r.red_flag)
  })

  const dates = [
    ...new Set(
      reports
        .map((r) => r.incident_date || r.created_at.slice(0, 10))
        .filter(Boolean),
    ),
  ].sort()

  return (
    <div className="cell-detail panel" role="dialog" aria-label={key}>
      <div className="cell-detail-head">
        <h2>
          {reports.length} {t.map.reports}
        </h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      {dates.length > 0 ? (
        <p className="cell-meta">
          <span className="cell-meta-label">{t.map.spotWhen}</span> {dates.join(' · ')}
        </p>
      ) : null}

      <p className="cell-meta-label">{t.map.spotType}</p>
      <ul className="cat-counts">
        {[...byCat.entries()].map(([cat, n]) => (
          <li key={cat}>
            <span
              className="swatch"
              style={{ background: CATEGORY_MAP[cat as Report['category']].color }}
            />
            {t.categories[cat as keyof typeof t.categories]}
            <span className="legend-count">{n}</span>
          </li>
        ))}
      </ul>

      {publicOnes.length > 0 ? (
        <ul className="snippets">
          {publicOnes.slice(0, 5).map((r) => (
            <li key={r.id}>
              {r.time_band ? <em>{r.time_band}</em> : null}{' '}
              {r.what_happened || r.red_flag}
              {r.vehicle_type || r.vehicle_color
                ? ` (${[r.vehicle_color, r.vehicle_type, r.vehicle_direction].filter(Boolean).join(' ')})`
                : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">{t.map.noText}</p>
      )}

      <p className="petition-line">
        {t.map.petitioned}: <strong>{petitionCount}</strong>
      </p>
      <button type="button" className="primary" onClick={onPetition}>
        {t.map.petition}
      </button>
    </div>
  )
}
