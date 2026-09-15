import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { CATEGORY_MAP, roleWeight } from '../data/categories'
import { useI18n } from '../i18n'
import { clearDeepLinkParams, openWhatsAppSpotShare, spotShareUrl } from '../lib/deeplink'
import { gridKey } from '../lib/grid'
import { petitionsForCell, areaPetitions } from '../lib/petitions'
import { flagReport, hasFlaggedReport } from '../lib/reports'
import type { AreaPetition, CategoryId, Report } from '../types'
import type { MissingPerson } from '../types-missing'
import { CellDetail } from './CellDetail'
import { MapGuide } from './MapGuide'
import { MissingBoard } from './MissingBoard'
import { MissingStrip } from './MissingStrip'
import { PetitionBoard } from './PetitionBoard'
import { PetitionSheet } from './PetitionSheet'
import { PetitionStrip } from './PetitionStrip'
import 'leaflet/dist/leaflet.css'

type TimeFilter = '7' | '30' | '90' | 'all'

type Props = {
  reports: Report[]
  petitions: AreaPetition[]
  onPetitionsChange: () => void
  missingPeople: MissingPerson[]
  onMissingChange: () => void
  onGoReport?: () => void
  initialSpotKey?: string | null
  initialPetitionId?: string | null
  focusSpotKey?: string | null
  onFocusSpotConsumed?: () => void
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

function MapController({
  center,
  zoom,
}: {
  center: [number, number] | null
  zoom: number | null
}) {
  const map = useMap()
  useEffect(() => {
    if (center && zoom != null) {
      map.flyTo(center, zoom, { duration: 0.8 })
    }
  }, [center, zoom, map])
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
  missingPeople,
  onMissingChange,
  onGoReport,
  initialSpotKey,
  initialPetitionId,
  focusSpotKey,
  onFocusSpotConsumed,
  pickMode,
  onPick,
  pickLat,
  pickLng,
}: Props) {
  const { t } = useI18n()
  const [catFilter, setCatFilter] = useState<Set<CategoryId> | 'all'>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [selectedKey, setSelectedKey] = useState<string | null>(initialSpotKey ?? null)
  const [toast, setToast] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [missingOpen, setMissingOpen] = useState(false)
  const [petitionOpen, setPetitionOpen] = useState(Boolean(initialPetitionId))
  const [petitionBoardOpen, setPetitionBoardOpen] = useState(false)
  const [focusPetitionId, setFocusPetitionId] = useState<string | null>(
    initialPetitionId ?? null,
  )
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null)
  const [flyZoom, setFlyZoom] = useState<number | null>(null)
  const deepLinkApplied = useRef(false)

  const visibleReports = useMemo(
    () => reports.filter((r) => !r.hidden),
    [reports],
  )

  const filtered = useMemo(() => {
    const cutoff = timeFilter === 'all' ? null : daysAgo(Number(timeFilter))
    return visibleReports.filter((r) => {
      if (catFilter !== 'all' && !catFilter.has(r.category)) return false
      if (cutoff && new Date(r.created_at) < cutoff) return false
      return true
    })
  }, [visibleReports, catFilter, timeFilter])

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
  const cellPetitions = selected ? petitionsForCell(petitions, selected.key) : []
  const petitionKeys = useMemo(
    () => new Set(areaPetitions(petitions).map((p) => p.grid_key)),
    [petitions],
  )
  const missingActive = useMemo(
    () => missingPeople.filter((p) => p.status === 'missing' && !p.hidden).length,
    [missingPeople],
  )

  function openPetitionById(id: string) {
    const p = petitions.find((x) => x.id === id)
    if (!p) return
    setPetitionBoardOpen(false)
    setSelectedKey(p.grid_key)
    setFocusPetitionId(p.id)
    setPetitionOpen(true)
    setFlyTo([p.grid_lat, p.grid_lng])
    setFlyZoom(15)
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
  }, [])

  useEffect(() => {
    if (deepLinkApplied.current) return
    if (initialPetitionId) {
      const p = petitions.find((x) => x.id === initialPetitionId)
      if (p) {
        deepLinkApplied.current = true
        setSelectedKey(p.grid_key)
        setFocusPetitionId(p.id)
        setPetitionOpen(true)
        setFlyTo([p.grid_lat, p.grid_lng])
        setFlyZoom(14)
        clearDeepLinkParams()
      }
    } else if (initialSpotKey) {
      deepLinkApplied.current = true
      setSelectedKey(initialSpotKey)
      const cell = cells.find((c) => c.key === initialSpotKey)
      if (cell) {
        setFlyTo([cell.lat, cell.lng])
        setFlyZoom(14)
      }
      clearDeepLinkParams()
    }
  }, [initialPetitionId, initialSpotKey, petitions, cells])

  useEffect(() => {
    if (!focusSpotKey) return
    setGuideOpen(false)
    setPetitionOpen(false)
    setSelectedKey(focusSpotKey)
    const cell = cells.find((c) => c.key === focusSpotKey)
    if (cell) {
      setFlyTo([cell.lat, cell.lng])
      setFlyZoom(15)
    } else {
      const [a, b] = focusSpotKey.split('_')
      const lat = Number(a)
      const lng = Number(b)
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setFlyTo([lat, lng])
        setFlyZoom(15)
      }
    }
    onFocusSpotConsumed?.()
  }, [focusSpotKey, cells, onFocusSpotConsumed])

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

  function goNearMe() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFlyTo([pos.coords.latitude, pos.coords.longitude])
        setFlyZoom(13)
      },
      () => setToast(t.map.tapHint),
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  function goOverview() {
    setFlyTo([-26.1, 28.22])
    setFlyZoom(10)
  }

  async function onFlagReport(reportId: string) {
    if (hasFlaggedReport(reportId)) {
      setToast(t.map.flagAlready)
      setTimeout(() => setToast(null), 2000)
      return
    }
    const res = await flagReport(reportId)
    setToast(res.hidden ? t.map.flagHidden : res.ok ? t.map.flagThanks : t.map.flagAlready)
    setTimeout(() => setToast(null), 2500)
    onPetitionsChange()
  }

  function onShareSpot() {
    if (!selected) return
    const url = spotShareUrl(selected.key)
    void navigator.clipboard?.writeText(url).then(() => {
      setToast(t.map.shareSpotCopied)
      setTimeout(() => setToast(null), 2000)
    })
    openWhatsAppSpotShare(selected.key, t.appName)
  }

  const summary = t.map.spotsSummary.replace('{count}', String(cells.length))

  const guide = (
    <>
      <MapGuide
        reports={visibleReports}
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
        <div className="chip-row" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="chip" onClick={goNearMe}>
            {t.map.nearMe}
          </button>
          <button type="button" className="chip" onClick={goOverview}>
            {t.map.overview}
          </button>
        </div>
        <p className="hint">{t.map.tapHint}</p>
      </div>
    </>
  )

  return (
    <div className={`map-layout ${pickMode ? 'pick-mode' : ''}`}>
      {!pickMode && (
        <div className="map-side map-side-desktop">
          <MissingStrip people={missingPeople} onOpen={() => setMissingOpen(true)} />
          <PetitionStrip
            petitions={petitions}
            onOpen={() => setPetitionBoardOpen(true)}
            onOpenOne={openPetitionById}
          />
          {guide}
        </div>
      )}

      <div className="map-stage">
        {!pickMode && (
          <div className="map-chrome">
            <div className="map-chrome-row">
              <p className="map-chrome-summary">{summary}</p>
            </div>
            <div className="map-chrome-actions">
              <button type="button" className="map-chrome-btn" onClick={goNearMe}>
                {t.map.nearMe}
              </button>
              <button
                type="button"
                className="map-chrome-btn"
                onClick={() => setMissingOpen(true)}
              >
                {t.missing.stripTitle}
                {missingActive > 0 ? ` (${missingActive})` : ''}
              </button>
              <button
                type="button"
                className="map-chrome-btn map-chrome-btn-petition"
                onClick={() => setPetitionBoardOpen(true)}
              >
                {t.map.petitionsChrome}
                {petitions.length > 0 ? ` (${petitions.length})` : ''}
              </button>
              <button
                type="button"
                className="map-chrome-btn"
                onClick={() => setGuideOpen(true)}
              >
                {t.map.openGuide}
              </button>
            </div>
          </div>
        )}

        <MapContainer
          center={[-26.1, 28.22]}
          zoom={pickMode ? 12 : 10}
          className="leaflet-root"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={flyTo} zoom={flyZoom} />
          {pickMode && onPick ? <PickHandler onPick={onPick} /> : null}
          {cells.map((cell) => {
            const hasPetition = petitionKeys.has(cell.key)
            return (
              <CircleMarker
                key={cell.key}
                center={[cell.lat, cell.lng]}
                radius={Math.min(10 + cell.heat * 3, 28)}
                pathOptions={{
                  color: hasPetition ? '#5c2d91' : cell.primaryColor,
                  fillColor: cell.primaryColor,
                  fillOpacity: 0.72,
                  weight: hasPetition ? 4 : 2,
                }}
                eventHandlers={{
                  click: () => {
                    if (pickMode && onPick) {
                      onPick(cell.lat, cell.lng)
                      return
                    }
                    setGuideOpen(false)
                    setPetitionBoardOpen(false)
                    setSelectedKey(cell.key)
                  },
                }}
              />
            )
          })}
          {!pickMode &&
            cells
              .filter((c) => petitionKeys.has(c.key))
              .map((cell) => (
                <CircleMarker
                  key={`pet-${cell.key}`}
                  center={[cell.lat, cell.lng]}
                  radius={Math.min(16 + cell.heat * 3, 34)}
                  pathOptions={{
                    color: '#5c2d91',
                    fillOpacity: 0,
                    weight: 2,
                    dashArray: '5 4',
                  }}
                  eventHandlers={{
                    click: () => {
                      setGuideOpen(false)
                      setPetitionBoardOpen(false)
                      setSelectedKey(cell.key)
                    },
                  }}
                />
              ))}
          {pickMode && pickLat != null && pickLng != null ? (
            <CircleMarker
              center={[pickLat, pickLng]}
              radius={10}
              pathOptions={{ color: '#5c2d91', fillColor: '#7348a8', fillOpacity: 0.9 }}
            />
          ) : null}
        </MapContainer>

        {!pickMode && !selected && !petitionBoardOpen && !petitionOpen && (
          <p className="map-tap-hint">
            {t.map.tapSpot}
            {petitions.length > 0 ? ` · ${t.map.petitionMapHint}` : ''}
          </p>
        )}

        {selected && !pickMode && !petitionOpen && !petitionBoardOpen ? (
          <CellDetail
            reports={selected.reports}
            petitionCount={cellPetitions.length}
            onOpenPetitions={() => {
              setFocusPetitionId(null)
              setPetitionOpen(true)
            }}
            onShareSpot={onShareSpot}
            onFlagReport={(id) => void onFlagReport(id)}
            onClose={() => setSelectedKey(null)}
          />
        ) : null}
        {toast ? <div className="toast">{toast}</div> : null}

        {guideOpen && !pickMode ? (
          <div className="map-sheet" role="dialog" aria-label={t.map.openGuide}>
            <div className="map-sheet-scrim" onClick={() => setGuideOpen(false)} />
            <div className="map-sheet-panel">
              <div className="map-sheet-bar">
                <strong>{t.map.openGuide}</strong>
                <button type="button" className="linkish" onClick={() => setGuideOpen(false)}>
                  {t.map.closeGuide}
                </button>
              </div>
              <div className="map-sheet-body">{guide}</div>
            </div>
          </div>
        ) : null}

        {missingOpen && !pickMode ? (
          <MissingBoard
            people={missingPeople}
            onClose={() => setMissingOpen(false)}
            onChange={onMissingChange}
          />
        ) : null}

        {petitionBoardOpen && !pickMode && !petitionOpen ? (
          <PetitionBoard
            petitions={petitions}
            onClose={() => setPetitionBoardOpen(false)}
            onSelect={(p) => openPetitionById(p.id)}
            canStartHere={Boolean(selected)}
            onStartHere={() => {
              if (!selected) return
              setPetitionBoardOpen(false)
              setFocusPetitionId(null)
              setPetitionOpen(true)
            }}
          />
        ) : null}

        {petitionOpen && selected && !pickMode ? (
          <PetitionSheet
            cellLat={selected.lat}
            cellLng={selected.lng}
            cellKey={selected.key}
            petitions={petitions}
            focusId={focusPetitionId}
            onChange={onPetitionsChange}
            onClose={() => {
              setPetitionOpen(false)
              setFocusPetitionId(null)
            }}
          />
        ) : null}

        {petitionOpen && !selected && focusPetitionId && !pickMode ? (
          <PetitionSheet
            cellLat={
              petitions.find((p) => p.id === focusPetitionId)?.grid_lat ?? -26.1
            }
            cellLng={
              petitions.find((p) => p.id === focusPetitionId)?.grid_lng ?? 28.22
            }
            cellKey={
              petitions.find((p) => p.id === focusPetitionId)?.grid_key ?? ''
            }
            petitions={petitions}
            focusId={focusPetitionId}
            onChange={onPetitionsChange}
            onClose={() => {
              setPetitionOpen(false)
              setFocusPetitionId(null)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
