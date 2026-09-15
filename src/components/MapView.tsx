import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { CATEGORY_MAP, roleWeight } from '../data/categories'
import { useI18n } from '../i18n'
import { gridKey } from '../lib/grid'
import { signPetition } from '../lib/petitions'
import type { CategoryId, Petition, Report } from '../types'
import { CellDetail } from './CellDetail'
import { MapGuide } from './MapGuide'
import 'leaflet/dist/leaflet.css'

type TimeFilter = '7' | '30' | '90' | 'all'

type Props = {
  reports: Report[]
  petitions: Petition[]
  onPetitionsChange: (p: Petition[]) => void
  onGoReport?: () => void
  pickMode?: boolean
  onPick?: (lat: number, lng: number) => void
  pickLat?: number | null
  pickLng?: number | null
}

type Cell = {
  key: string
  lat: number
  lng: number
  reports: Report[]
  heat: number
  primaryColor: string
}

function PickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export function MapView({
  reports,
  petitions,
  onPetitionsChange,
  onGoReport,
  pickMode,
  onPick,
  pickLat,
  pickLng,
}: Props) {
  const { t } = useI18n()
  const [catFilter, setCatFilter] = useState<Set<CategoryId> | 'all'>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const cutoff =
      timeFilter === 'all'
        ? null
        : daysAgo(Number(timeFilter))
    return reports.filter((r) => {
      if (r.hidden) return false
      if (catFilter !== 'all' && !catFilter.has(r.category)) return false
      if (cutoff && new Date(r.created_at) < cutoff) return false
      return true
    })
  }, [reports, catFilter, timeFilter])

  const cells = useMemo(() => {
    const map = new Map<string, Cell>()
    for (const r of filtered) {
      const key = gridKey(r.grid_lat, r.grid_lng)
      let cell = map.get(key)
      if (!cell) {
        cell = {
          key,
          lat: r.grid_lat,
          lng: r.grid_lng,
          reports: [],
          heat: 0,
          primaryColor: CATEGORY_MAP[r.category].color,
        }
        map.set(key, cell)
      }
      cell.reports.push(r)
      cell.heat += roleWeight(r.reporter_role)
      // Dominant category by count
      const counts = new Map<string, number>()
      for (const x of cell.reports) counts.set(x.category, (counts.get(x.category) ?? 0) + 1)
      let best = cell.reports[0].category
      let bestN = 0
      for (const [c, n] of counts) {
        if (n > bestN) {
          bestN = n
          best = c as CategoryId
        }
      }
      cell.primaryColor = CATEGORY_MAP[best].color
    }
    return [...map.values()]
  }, [filtered])

  const selected = selectedKey ? cells.find((c) => c.key === selectedKey) : null
  const petitionCount =
    selected && petitions.find((p) => p.grid_key === selected.key)?.count

  useEffect(() => {
    // Fix default marker icons path issue if any markers used later
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
  }, [])

  function toggleCat(id: CategoryId) {
    setCatFilter((prev) => {
      if (prev === 'all') return new Set([id])
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) return 'all'
      return next
    })
  }

  async function handlePetition() {
    if (!selected) return
    const res = await signPetition(selected.lat, selected.lng)
    const key = selected.key
    const others = petitions.filter((p) => p.grid_key !== key)
    onPetitionsChange([
      ...others,
      {
        grid_key: key,
        count: res.count,
        grid_lat: selected.lat,
        grid_lng: selected.lng,
      },
    ])
    setToast(t.map.petitionThanks)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className={`map-layout ${pickMode ? 'pick-mode' : ''}`}>
      {!pickMode && (
        <div className="map-side">
          <MapGuide
            reports={reports}
            active={catFilter}
            onToggle={toggleCat}
            onClearFilter={() => setCatFilter('all')}
            onGoReport={() => onGoReport?.()}
          />
          <div className="panel time-filters">
            <h2>{t.map.timeRange}</h2>
            <div className="chip-row">
              {(
                [
                  ['7', t.map.days7],
                  ['30', t.map.days30],
                  ['90', t.map.days90],
                  ['all', t.map.allTime],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={timeFilter === v ? 'chip on' : 'chip'}
                  onClick={() => setTimeFilter(v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="hint">{t.map.tapHint}</p>
          </div>
        </div>
      )}

      <div className="map-stage">
        <MapContainer
          center={[-26.1, 28.22]}
          zoom={pickMode ? 12 : 6}
          className="leaflet-root"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pickMode && onPick ? <PickHandler onPick={onPick} /> : null}
          {cells.map((cell) => (
            <CircleMarker
              key={cell.key}
              center={[cell.lat, cell.lng]}
              radius={Math.min(8 + cell.heat * 3, 28)}
              pathOptions={{
                color: cell.primaryColor,
                fillColor: cell.primaryColor,
                fillOpacity: 0.65,
                weight: 2,
              }}
              eventHandlers={{
                click: () => {
                  if (pickMode && onPick) {
                    onPick(cell.lat, cell.lng)
                    return
                  }
                  setSelectedKey(cell.key)
                },
              }}
            />
          ))}
          {pickMode && pickLat != null && pickLng != null ? (
            <CircleMarker
              center={[pickLat, pickLng]}
              radius={10}
              pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.9 }}
            />
          ) : null}
        </MapContainer>

        {selected && !pickMode ? (
          <CellDetail
            reports={selected.reports}
            petitionCount={petitionCount ?? 0}
            onPetition={handlePetition}
            onClose={() => setSelectedKey(null)}
          />
        ) : null}
        {toast ? <div className="toast">{toast}</div> : null}
      </div>
    </div>
  )
}
