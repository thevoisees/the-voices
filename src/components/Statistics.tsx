import { useEffect, useMemo, useState } from 'react'
import {
  areaCaution,
  isSevereCategory,
  type AreaCaution,
  type AreaStat,
} from '../data/awareness'
import { CATEGORIES, CATEGORY_MAP } from '../data/categories'
import { useI18n } from '../i18n'
import { gridKey } from '../lib/grid'
import {
  peekPlaceName,
  placeCacheKey,
  resolvePlaceName,
} from '../lib/placename'
import type { AffectedGender, CategoryId, Report, TimeBand } from '../types'
import type { MissingPerson } from '../types-missing'

type Props = {
  reports: Report[]
  missingPeople: MissingPerson[]
  onOpenArea?: (spotKey: string) => void
}

const GENDERS: AffectedGender[] = ['woman', 'man', 'girl', 'boy', 'unknown']
const TIMES: TimeBand[] = ['morning', 'afternoon', 'evening', 'night']

function countBy<T extends string>(items: T[]): Map<T, number> {
  const m = new Map<T, number>()
  for (const x of items) m.set(x, (m.get(x) ?? 0) + 1)
  return m
}

function genderLabel(
  g: AffectedGender | null | undefined,
  t: ReturnType<typeof useI18n>['t'],
): string {
  if (!g) return t.stats.notSaid
  if (g === 'woman') return t.report.genderWoman
  if (g === 'man') return t.report.genderMan
  if (g === 'girl') return t.report.genderGirl
  if (g === 'boy') return t.report.genderBoy
  return t.report.genderUnknown
}

function tipKeyForCategory(
  id: CategoryId,
):
  | 'tipFollowed'
  | 'tipGrabbed'
  | 'tipHarassment'
  | 'tipLiftWrong'
  | 'tipRedFlag'
  | 'tipUnsafe'
  | 'tipMissing'
  | 'tipRemains'
  | 'tipBodyDump'
  | null {
  if (id === 'followed') return 'tipFollowed'
  if (id === 'grabbed') return 'tipGrabbed'
  if (id === 'harassment') return 'tipHarassment'
  if (id === 'lift_wrong') return 'tipLiftWrong'
  if (id === 'red_flag') return 'tipRedFlag'
  if (id === 'unsafe_around_someone') return 'tipUnsafe'
  if (id === 'missing') return 'tipMissing'
  if (id === 'possible_remains') return 'tipRemains'
  if (id === 'body_dump') return 'tipBodyDump'
  return null
}

function tipKeyForTime(
  tb: TimeBand,
): 'tipMorning' | 'tipAfternoon' | 'tipEvening' | 'tipNight' {
  if (tb === 'morning') return 'tipMorning'
  if (tb === 'afternoon') return 'tipAfternoon'
  if (tb === 'evening') return 'tipEvening'
  return 'tipNight'
}

function buildAreas(reports: Report[]): AreaStat[] {
  const map = new Map<
    string,
    {
      lat: number
      lng: number
      reports: Report[]
    }
  >()
  for (const r of reports) {
    const key = gridKey(r.grid_lat, r.grid_lng)
    let cell = map.get(key)
    if (!cell) {
      cell = { lat: r.grid_lat, lng: r.grid_lng, reports: [] }
      map.set(key, cell)
    }
    cell.reports.push(r)
  }

  const areas: AreaStat[] = []
  for (const [key, cell] of map) {
    const byCat = countBy(cell.reports.map((r) => r.category))
    const topCategories = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c)

    const times = cell.reports
      .map((r) => r.time_band)
      .filter((x): x is TimeBand => Boolean(x))
    const byTime = countBy(times)
    let topTime: TimeBand | null = null
    let topN = 0
    for (const [tb, n] of byTime) {
      if (n > topN) {
        topN = n
        topTime = tb
      }
    }

    const severe = cell.reports.some((r) => isSevereCategory(r.category))
    areas.push({
      key,
      lat: cell.lat,
      lng: cell.lng,
      count: cell.reports.length,
      topCategories,
      topTime,
      caution: areaCaution(cell.reports.length, severe),
    })
  }

  return areas.sort((a, b) => {
    const rank = (c: AreaCaution) => (c === 'caution' ? 3 : c === 'aware' ? 2 : 1)
    const d = rank(b.caution) - rank(a.caution)
    if (d !== 0) return d
    return b.count - a.count
  })
}

function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string
  count: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <li className="stats-bar-row">
      <div className="stats-bar-meta">
        <span className="stats-bar-label">
          {color ? <span className="swatch" style={{ background: color }} /> : null}
          {label}
        </span>
        <span className="legend-count">{count}</span>
      </div>
      <div className="stats-bar-track" aria-hidden>
        <div
          className="stats-bar-fill"
          style={{ width: `${pct}%`, background: color || 'var(--purple)' }}
        />
      </div>
    </li>
  )
}

function TipList({ tips }: { tips: string[] }) {
  if (!tips.length) return null
  return (
    <ul className="stats-tips">
      {tips.map((tip) => (
        <li key={tip}>{tip}</li>
      ))}
    </ul>
  )
}

export function Statistics({ reports, missingPeople, onOpenArea }: Props) {
  const { t } = useI18n()
  const [placeNames, setPlaceNames] = useState<Record<string, string>>({})

  const summary = useMemo(() => {
    const visible = reports.filter((r) => !r.hidden)
    const spots = new Set(visible.map((r) => gridKey(r.grid_lat, r.grid_lng))).size
    const bodyDumps = visible.filter((r) => r.category === 'body_dump').length
    const women = visible.filter(
      (r) => r.affected_gender === 'woman' || r.affected_gender === 'girl',
    ).length

    const byCat = countBy(visible.map((r) => r.category))
    const byGender = new Map<string, number>()
    for (const r of visible) {
      const k = r.affected_gender ?? 'not_said'
      byGender.set(k, (byGender.get(k) ?? 0) + 1)
    }
    const byTime = countBy(
      visible
        .map((r) => r.time_band)
        .filter((x): x is TimeBand => Boolean(x)),
    )

    const visibleMissing = missingPeople.filter((p) => !p.hidden)
    const stillMissing = visibleMissing.filter((p) => p.status === 'missing').length
    const foundAlive = visibleMissing.filter((p) => p.status === 'found_alive').length
    const foundDead = visibleMissing.filter((p) => p.status === 'found_dead').length

    const areas = buildAreas(visible)

    const catMax = Math.max(1, ...[...byCat.values()])
    const genderMax = Math.max(1, ...[...byGender.values()])
    const timeMax = Math.max(1, ...[...byTime.values()])

    return {
      total: visible.length,
      spots,
      bodyDumps,
      women,
      byCat,
      byGender,
      byTime,
      catMax,
      genderMax,
      timeMax,
      stillMissing,
      foundAlive,
      foundDead,
      missingTotal: visibleMissing.length,
      areas,
    }
  }, [reports, missingPeople])

  useEffect(() => {
    const top = summary.areas.slice(0, 10)
    const initial: Record<string, string> = {}
    for (const a of top) {
      const peek = peekPlaceName(a.lat, a.lng)
      if (peek) initial[placeCacheKey(a.lat, a.lng)] = peek
    }
    if (Object.keys(initial).length) setPlaceNames((prev) => ({ ...initial, ...prev }))

    let cancelled = false
    ;(async () => {
      for (const a of top) {
        const name = await resolvePlaceName(a.lat, a.lng)
        if (cancelled) return
        setPlaceNames((prev) => ({
          ...prev,
          [placeCacheKey(a.lat, a.lng)]: name,
        }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [summary.areas])

  const timeLabels: Record<TimeBand, string> = {
    morning: t.report.morning,
    afternoon: t.report.afternoon,
    evening: t.report.evening,
    night: t.report.night,
  }

  function levelLabel(c: AreaCaution): string {
    if (c === 'caution') return t.stats.levelCaution
    if (c === 'aware') return t.stats.levelAware
    return t.stats.levelNotice
  }

  const activeCategories = CATEGORIES.filter((c) => (summary.byCat.get(c.id) ?? 0) > 0)
  const categoriesForTips =
    activeCategories.length > 0 ? activeCategories : CATEGORIES.filter((c) => c.id === 'body_dump')

  return (
    <div className="page-scroll">
      <div className="stats-page">
        <header className="stats-head">
          <h1>{t.stats.title}</h1>
          <p className="hint">{t.stats.lead}</p>
        </header>

        <div className="stats-kpis">
          <div className="stats-kpi panel">
            <span className="stats-kpi-n">{summary.total}</span>
            <span className="stats-kpi-l">{t.stats.totalReports}</span>
          </div>
          <div className="stats-kpi panel">
            <span className="stats-kpi-n">{summary.spots}</span>
            <span className="stats-kpi-l">{t.stats.spots}</span>
          </div>
          <div className="stats-kpi panel">
            <span className="stats-kpi-n">{summary.bodyDumps}</span>
            <span className="stats-kpi-l">{t.stats.bodyDumps}</span>
          </div>
          <div className="stats-kpi panel">
            <span className="stats-kpi-n">{summary.women}</span>
            <span className="stats-kpi-l">{t.stats.womenGirls}</span>
          </div>
        </div>

        <section className="panel stats-section">
          <h2>{t.stats.areasTitle}</h2>
          <p className="hint">{t.stats.areasLead}</p>
          {summary.areas.length === 0 ? (
            <p className="hint">{t.stats.areasEmpty}</p>
          ) : (
            <ul className="stats-areas">
              {summary.areas.slice(0, 10).map((area) => {
                const types = area.topCategories
                  .map((id) => t.categories[id as keyof typeof t.categories])
                  .join(' · ')
                const place =
                  placeNames[placeCacheKey(area.lat, area.lng)] ??
                  peekPlaceName(area.lat, area.lng)
                const clickable = Boolean(onOpenArea)
                const body = (
                  <>
                    <div className="stats-area-head">
                      <strong className="stats-area-watch">{t.stats.beAware}</strong>
                      <span className={`stats-level stats-level-${area.caution}`}>
                        {levelLabel(area.caution)}
                      </span>
                    </div>
                    <p className="stats-area-zone">
                      {place
                        ? t.stats.zoneNamed.replace('{place}', place)
                        : t.stats.resolvingPlace}
                    </p>
                    <p className="stats-area-meta">
                      {t.stats.zoneCoords
                        .replace('{lat}', area.lat.toFixed(4))
                        .replace('{lng}', area.lng.toFixed(4))}
                    </p>
                    <p className="stats-area-meta">
                      {t.stats.reportsHere.replace('{n}', String(area.count))}
                    </p>
                    {types ? (
                      <p className="stats-area-meta">
                        {t.stats.commonHere.replace('{types}', types)}
                      </p>
                    ) : null}
                    {area.topTime ? (
                      <p className="stats-area-meta">
                        {t.stats.watchTime.replace('{time}', timeLabels[area.topTime])}
                      </p>
                    ) : null}
                    {clickable ? (
                      <span className="stats-area-open">{t.stats.viewOnMap}</span>
                    ) : null}
                  </>
                )
                return (
                  <li key={area.key} className={`stats-area stats-area-${area.caution}`}>
                    {clickable ? (
                      <button
                        type="button"
                        className="stats-area-btn"
                        onClick={() => onOpenArea?.(area.key)}
                      >
                        {body}
                      </button>
                    ) : (
                      body
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="panel stats-section">
          <h2>{t.stats.measuresTitle}</h2>
          <p className="hint">{t.stats.measuresLead}</p>

          <h3 className="stats-subhead">{t.stats.measuresGeneralTitle}</h3>
          <TipList tips={t.stats.tipGeneral} />

          {summary.women > 0 ? (
            <>
              <h3 className="stats-subhead">{t.stats.measuresWomenTitle}</h3>
              <TipList tips={t.stats.tipWomenGirls} />
            </>
          ) : null}

          <h3 className="stats-subhead">{t.stats.measuresByTypeTitle}</h3>
          {categoriesForTips.map((c) => {
            const key = tipKeyForCategory(c.id)
            if (!key) return null
            const tips = t.stats[key]
            const n = summary.byCat.get(c.id) ?? 0
            return (
              <div key={c.id} className="stats-measure-block">
                <p className="stats-measure-label">
                  <span className="swatch" style={{ background: CATEGORY_MAP[c.id].color }} />
                  {t.categories[c.labelKey as keyof typeof t.categories]}
                  {n > 0 ? <span className="legend-count">{n}</span> : null}
                </p>
                <TipList tips={tips} />
              </div>
            )
          })}

          <h3 className="stats-subhead">{t.stats.measuresByTimeTitle}</h3>
          {TIMES.map((tb) => {
            const n = summary.byTime.get(tb) ?? 0
            if (summary.total > 0 && n === 0) return null
            return (
              <div key={tb} className="stats-measure-block">
                <p className="stats-measure-label">
                  {timeLabels[tb]}
                  {n > 0 ? <span className="legend-count">{n}</span> : null}
                </p>
                <TipList tips={t.stats[tipKeyForTime(tb)]} />
              </div>
            )
          })}
        </section>

        <section className="panel stats-section">
          <h2>{t.stats.missingTitle}</h2>
          <p className="hint">{t.stats.missingLead}</p>
          <div className="stats-kpis stats-kpis-missing">
            <div className="stats-kpi">
              <span className="stats-kpi-n">{summary.stillMissing}</span>
              <span className="stats-kpi-l">{t.stats.stillMissing}</span>
            </div>
            <div className="stats-kpi">
              <span className="stats-kpi-n">{summary.foundAlive}</span>
              <span className="stats-kpi-l">{t.stats.foundAlive}</span>
            </div>
            <div className="stats-kpi">
              <span className="stats-kpi-n">{summary.foundDead}</span>
              <span className="stats-kpi-l">{t.stats.foundDead}</span>
            </div>
          </div>
        </section>

        <section className="panel stats-section">
          <h2>{t.stats.byGender}</h2>
          <p className="hint">{t.stats.genderNote}</p>
          <ul className="stats-bars">
            {GENDERS.map((g) => (
              <BarRow
                key={g}
                label={genderLabel(g, t)}
                count={summary.byGender.get(g) ?? 0}
                max={summary.genderMax}
              />
            ))}
            <BarRow
              label={t.stats.notSaid}
              count={summary.byGender.get('not_said') ?? 0}
              max={summary.genderMax}
              color="var(--muted)"
            />
          </ul>
        </section>

        <section className="panel stats-section">
          <h2>{t.stats.byType}</h2>
          <ul className="stats-bars">
            {CATEGORIES.map((c) => {
              const n = summary.byCat.get(c.id) ?? 0
              if (n === 0) return null
              return (
                <BarRow
                  key={c.id}
                  label={t.categories[c.labelKey as keyof typeof t.categories]}
                  count={n}
                  max={summary.catMax}
                  color={CATEGORY_MAP[c.id].color}
                />
              )
            })}
          </ul>
          {summary.total === 0 ? <p className="hint">{t.stats.empty}</p> : null}
        </section>

        <section className="panel stats-section">
          <h2>{t.stats.byTime}</h2>
          <ul className="stats-bars">
            {TIMES.map((tb) => (
              <BarRow
                key={tb}
                label={timeLabels[tb]}
                count={summary.byTime.get(tb) ?? 0}
                max={summary.timeMax}
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
