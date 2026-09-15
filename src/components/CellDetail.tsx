import { CATEGORY_MAP, roleWeight } from '../data/categories'
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
  let heat = 0
  for (const r of reports) {
    byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1)
    heat += roleWeight(r.reporter_role)
  }

  const publicOnes = reports.filter((r) => {
    const meta = CATEGORY_MAP[r.category]
    return meta.publicText && !meta.countOnly && !r.involves_minor && (r.what_happened || r.red_flag)
  })

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
      <ul className="cat-counts">
        {[...byCat.entries()].map(([cat, n]) => (
          <li key={cat}>
            <span
              className="swatch"
              style={{ background: CATEGORY_MAP[cat as Report['category']].color }}
            />
            {t.categories[cat as keyof typeof t.categories]}: {n}
          </li>
        ))}
      </ul>
      <p className="hint">Heat weight: {heat.toFixed(1)}</p>
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
