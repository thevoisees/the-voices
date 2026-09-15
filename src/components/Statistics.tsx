import { useMemo } from 'react'
import { CATEGORIES, CATEGORY_MAP } from '../data/categories'
import { useI18n } from '../i18n'
import { gridKey } from '../lib/grid'
import type { AffectedGender, Report, TimeBand } from '../types'
import type { MissingPerson } from '../types-missing'

type Props = {
  reports: Report[]
  missingPeople: MissingPerson[]
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

export function Statistics({ reports, missingPeople }: Props) {
  const { t } = useI18n()

  const summary = useMemo(() => {
    const spots = new Set(reports.map((r) => gridKey(r.grid_lat, r.grid_lng))).size
    const bodyDumps = reports.filter((r) => r.category === 'body_dump').length
    const women = reports.filter(
      (r) => r.affected_gender === 'woman' || r.affected_gender === 'girl',
    ).length

    const byCat = countBy(reports.map((r) => r.category))
    const byGender = new Map<string, number>()
    for (const r of reports) {
      const k = r.affected_gender ?? 'not_said'
      byGender.set(k, (byGender.get(k) ?? 0) + 1)
    }
    const byTime = countBy(
      reports
        .map((r) => r.time_band)
        .filter((x): x is TimeBand => Boolean(x)),
    )

    const stillMissing = missingPeople.filter((p) => p.status === 'missing').length
    const foundAlive = missingPeople.filter((p) => p.status === 'found_alive').length
    const foundDead = missingPeople.filter((p) => p.status === 'found_dead').length

    const catMax = Math.max(1, ...[...byCat.values()])
    const genderMax = Math.max(1, ...[...byGender.values()])
    const timeMax = Math.max(1, ...[...byTime.values()])

    return {
      total: reports.length,
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
      missingTotal: missingPeople.length,
    }
  }, [reports, missingPeople])

  const timeLabels: Record<TimeBand, string> = {
    morning: t.report.morning,
    afternoon: t.report.afternoon,
    evening: t.report.evening,
    night: t.report.night,
  }

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
