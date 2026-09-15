import { CATEGORY_MAP } from '../data/categories'
import { useI18n } from '../i18n'
import { gridKey } from '../lib/grid'
import { hasFlaggedReport } from '../lib/reports'
import type { AffectedGender, Report } from '../types'

type Props = {
  reports: Report[]
  petitionCount: number
  onOpenPetitions: () => void
  onShareSpot: () => void
  onFlagReport: (reportId: string) => void
  onClose: () => void
}

function genderLabel(
  g: AffectedGender,
  t: ReturnType<typeof useI18n>['t'],
): string {
  if (g === 'woman') return t.report.genderWoman
  if (g === 'man') return t.report.genderMan
  if (g === 'girl') return t.report.genderGirl
  if (g === 'boy') return t.report.genderBoy
  return t.report.genderUnknown
}

export function CellDetail({
  reports,
  petitionCount,
  onOpenPetitions,
  onShareSpot,
  onFlagReport,
  onClose,
}: Props) {
  const { t } = useI18n()
  if (!reports.length) return null

  const key = gridKey(reports[0].grid_lat, reports[0].grid_lng)
  const byCat = new Map<string, number>()
  for (const r of reports) {
    byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1)
  }

  const byGender = new Map<AffectedGender, number>()
  for (const r of reports) {
    if (!r.affected_gender) continue
    byGender.set(r.affected_gender, (byGender.get(r.affected_gender) ?? 0) + 1)
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

      {byGender.size > 0 ? (
        <>
          <p className="cell-meta-label">{t.map.spotGender}</p>
          <ul className="cat-counts">
            {[...byGender.entries()].map(([g, n]) => (
              <li key={g}>
                {genderLabel(g, t)}
                <span className="legend-count">{n}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {publicOnes.length > 0 ? (
        <ul className="snippets">
          {publicOnes.slice(0, 5).map((r) => (
            <li key={r.id}>
              {r.time_band ? <em>{r.time_band}</em> : null}{' '}
              {r.what_happened || r.red_flag}
              {r.vehicle_type || r.vehicle_color
                ? ` (${[r.vehicle_color, r.vehicle_type, r.vehicle_direction].filter(Boolean).join(' ')})`
                : ''}
              {!hasFlaggedReport(r.id) ? (
                <button
                  type="button"
                  className="linkish flag-inline"
                  onClick={() => onFlagReport(r.id)}
                >
                  {t.map.flagReport}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">{t.map.noText}</p>
      )}

      <div className="cell-petition-block">
        <p className="cell-meta-label">{t.map.petitionAction}</p>
        <p className="petition-line">
          {petitionCount > 0
            ? t.map.petitionOpenCount.replace('{n}', String(petitionCount))
            : t.map.petitionNoneHere}
        </p>
        <button type="button" className="primary" onClick={onOpenPetitions}>
          {petitionCount > 0 ? t.map.petition : t.map.startPetition}
        </button>
      </div>
      <button type="button" className="secondary" onClick={onShareSpot}>
        {t.map.shareSpot}
      </button>
    </div>
  )
}
