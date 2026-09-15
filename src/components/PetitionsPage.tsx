import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { useI18n } from '../i18n'
import { DEFAULT_PETITION_GOAL } from '../lib/device'
import { snapToGrid } from '../lib/grid'
import {
  areaPetitions,
  buildWhatsAppShareText,
  createPetition,
  downloadPetitionPack,
  flagPetition,
  hasSignedPetition,
  isNationalPetition,
  nationalPetitions,
  openWhatsAppShare,
  petitionGoalReached,
  signPetition,
} from '../lib/petitions'
import { peekPlaceName, resolvePlaceName } from '../lib/placename'
import type { AreaPetition, CommunityAnnouncement, PetitionScope } from '../types'
import { AnnouncementsSection } from './AnnouncementsSection'
import 'leaflet/dist/leaflet.css'

type Props = {
  petitions: AreaPetition[]
  announcements: CommunityAnnouncement[]
  onChange: () => void
  onAnnouncementsChange: () => void
  onOpenOnMap: (spotKey: string) => void
}

type Section = 'petitions' | 'announcements'
type Filter = 'all' | 'national' | 'area'
type Mode = 'list' | 'create' | 'detail'

function PlacePicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const g = snapToGrid(e.latlng.lat, e.latlng.lng)
      onPick(g.lat, g.lng)
    },
  })
  return null
}

export function PetitionsPage({
  petitions,
  announcements,
  onChange,
  onAnnouncementsChange,
  onOpenOnMap,
}: Props) {
  const { t } = useI18n()
  const [section, setSection] = useState<Section>('petitions')
  const [filter, setFilter] = useState<Filter>('all')
  const [mode, setMode] = useState<Mode>('list')
  const [selected, setSelected] = useState<AreaPetition | null>(null)
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<PetitionScope>('area')
  const [title, setTitle] = useState('')
  const [ask, setAsk] = useState('')
  const [goal, setGoal] = useState(DEFAULT_PETITION_GOAL)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [placeHint, setPlaceHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = petitions
    if (filter === 'national') list = nationalPetitions(petitions)
    if (filter === 'area') list = areaPetitions(petitions)
    const needle = q.trim().toLowerCase()
    if (!needle) return list
    return list.filter((p) => {
      const place =
        p.place_label ||
        peekPlaceName(p.grid_lat, p.grid_lng) ||
        ''
      return (
        p.title.toLowerCase().includes(needle) ||
        p.ask.toLowerCase().includes(needle) ||
        place.toLowerCase().includes(needle)
      )
    })
  }, [petitions, filter, q])

  useEffect(() => {
    if (lat == null || lng == null) {
      setPlaceHint(null)
      return
    }
    const peek = peekPlaceName(lat, lng)
    if (peek) setPlaceHint(peek)
    let cancelled = false
    void resolvePlaceName(lat, lng).then((name) => {
      if (!cancelled) setPlaceHint(name)
    })
    return () => {
      cancelled = true
    }
  }, [lat, lng])

  function placeLabel(p: AreaPetition): string {
    if (isNationalPetition(p)) return t.petitions.scopeNational
    return (
      p.place_label ||
      peekPlaceName(p.grid_lat, p.grid_lng) ||
      t.petitions.zoneNear
        .replace('{lat}', p.grid_lat.toFixed(4))
        .replace('{lng}', p.grid_lng.toFixed(4))
    )
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (scope === 'area' && (lat == null || lng == null)) {
      setStatus(t.petitions.needPlace)
      return
    }
    setBusy(true)
    const res = await createPetition({
      title,
      ask,
      scope,
      lat,
      lng,
      goal,
      place_label: scope === 'area' ? placeHint : null,
    })
    setBusy(false)
    if (!res.ok || !res.petition) {
      setStatus(
        res.error === 'need_place' ? t.petitions.needPlace : t.petitions.needFields,
      )
      return
    }
    setStatus(t.petitions.success)
    setTitle('')
    setAsk('')
    setLat(null)
    setLng(null)
    setPlaceHint(null)
    onChange()
    setSelected(res.petition)
    setMode('detail')
  }

  async function onSign(p: AreaPetition) {
    setBusy(true)
    const res = await signPetition(p.id)
    setBusy(false)
    if (!res.ok) {
      setStatus(res.error === 'already' ? t.petitions.alreadySigned : t.petitions.needFields)
      return
    }
    if (res.petition) setSelected(res.petition)
    setStatus(t.map.petitionThanks)
    onChange()
  }

  async function onFlag(p: AreaPetition) {
    const res = await flagPetition(p.id)
    if (!res.ok) {
      setStatus(t.map.flagAlready)
      return
    }
    setStatus(res.hidden ? t.map.flagHidden : t.map.flagThanks)
    if (res.hidden) {
      setSelected(null)
      setMode('list')
    }
    onChange()
  }

  const detail = selected
    ? petitions.find((p) => p.id === selected.id) ?? selected
    : null

  return (
    <div className="page-scroll">
      <div className="petitions-page">
        <header className="stats-head">
          <h1>{t.petitions.pageTitle}</h1>
          <p className="hint">{t.petitions.pageLead}</p>
        </header>

        <div className="chip-row petitions-section-tabs">
          <button
            type="button"
            className={section === 'petitions' ? 'chip on' : 'chip'}
            onClick={() => setSection('petitions')}
          >
            {t.petitions.sectionPetitions}
          </button>
          <button
            type="button"
            className={section === 'announcements' ? 'chip on' : 'chip'}
            onClick={() => setSection('announcements')}
          >
            {t.petitions.sectionAnnouncements}
            {announcements.length > 0 ? ` (${announcements.length})` : ''}
          </button>
        </div>

        {section === 'announcements' ? (
          <AnnouncementsSection
            announcements={announcements}
            onChange={onAnnouncementsChange}
          />
        ) : null}

        {section === 'petitions' ? (
          <>
        {status ? <p className="banner info">{status}</p> : null}

        <div className="chip-row">
          <button
            type="button"
            className={mode === 'list' ? 'chip on' : 'chip'}
            onClick={() => {
              setMode('list')
              setSelected(null)
            }}
          >
            {t.petitions.listTitle}
          </button>
          <button
            type="button"
            className={mode === 'create' ? 'chip on' : 'chip'}
            onClick={() => setMode('create')}
          >
            {t.petitions.createTitle}
          </button>
        </div>

        {mode === 'list' && !detail ? (
          <>
            <div className="chip-row">
              {(
                [
                  ['all', t.petitions.filterAll],
                  ['national', t.petitions.filterNational],
                  ['area', t.petitions.filterArea],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={filter === v ? 'chip on' : 'chip'}
                  onClick={() => setFilter(v)}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="petition-search">
              <span className="sr-only">{t.petitions.search}</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.petitions.search}
              />
            </label>

            {filtered.length === 0 ? (
              <p className="hint panel petitions-empty">{t.petitions.pageEmpty}</p>
            ) : (
              <ul className="petition-page-list">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="petition-page-card panel"
                      onClick={() => {
                        setSelected(p)
                        setMode('detail')
                      }}
                    >
                      <span
                        className={`petition-scope-tag petition-scope-${p.scope ?? 'area'}`}
                      >
                        {isNationalPetition(p)
                          ? t.petitions.scopeNational
                          : t.petitions.scopeArea}
                      </span>
                      <strong>{p.title}</strong>
                      <em>{p.ask}</em>
                      <small>
                        {placeLabel(p)}
                        {' · '}
                        {t.petitions.progress
                          .replace('{count}', String(p.count))
                          .replace('{goal}', String(p.goal))}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        {mode === 'create' ? (
          <form className="form panel" onSubmit={onCreate}>
            <fieldset className="petition-scope-fieldset">
              <legend>{t.petitions.scopeLabel}</legend>
              <label className="check">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'national'}
                  onChange={() => setScope('national')}
                />
                <span>
                  <strong>{t.petitions.scopeNational}</strong>
                  <em>{t.petitions.scopeNationalHint}</em>
                </span>
              </label>
              <label className="check">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'area'}
                  onChange={() => setScope('area')}
                />
                <span>
                  <strong>{t.petitions.scopeArea}</strong>
                  <em>{t.petitions.scopeAreaHint}</em>
                </span>
              </label>
            </fieldset>

            <label>
              {t.petitions.name}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
                placeholder={t.petitions.namePlaceholder}
              />
            </label>
            <label>
              {t.petitions.ask}
              <textarea
                rows={3}
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                maxLength={280}
                required
                placeholder={t.petitions.askPlaceholder}
              />
            </label>
            <label>
              {t.petitions.goal}
              <input
                type="number"
                min={1}
                max={500}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value) || DEFAULT_PETITION_GOAL)}
              />
            </label>

            {scope === 'area' ? (
              <fieldset>
                <legend>{t.petitions.pickPlace}</legend>
                <p className="hint">{t.petitions.pickPlaceHint}</p>
                <div className="mini-map">
                  <MapContainer center={[-26.1, 28.22]} zoom={11} className="leaflet-mini">
                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <PlacePicker
                      onPick={(a, b) => {
                        setLat(a)
                        setLng(b)
                      }}
                    />
                    {lat != null && lng != null ? (
                      <CircleMarker
                        center={[lat, lng]}
                        radius={10}
                        pathOptions={{
                          color: '#5c2d91',
                          fillColor: '#7348a8',
                          fillOpacity: 0.9,
                        }}
                      />
                    ) : null}
                  </MapContainer>
                </div>
                {placeHint ? (
                  <p className="banner success">{placeHint}</p>
                ) : lat != null && lng != null ? (
                  <p className="hint">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            <button type="submit" className="primary" disabled={busy}>
              {busy ? t.petitions.creating : t.petitions.create}
            </button>
          </form>
        ) : null}

        {mode === 'detail' && detail ? (
          <div className="petition-detail panel">
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setMode('list')
                setSelected(null)
              }}
            >
              ← {t.petitions.listTitle}
            </button>
            <span
              className={`petition-scope-tag petition-scope-${detail.scope ?? 'area'}`}
            >
              {isNationalPetition(detail)
                ? t.petitions.scopeNational
                : t.petitions.scopeArea}
            </span>
            <h2>{detail.title}</h2>
            <p>{detail.ask}</p>
            <p className="hint">{placeLabel(detail)}</p>

            <div className="petition-progress">
              <p>
                {t.petitions.progress
                  .replace('{count}', String(detail.count))
                  .replace('{goal}', String(detail.goal))}
              </p>
              <div className="stats-bar-track" aria-hidden>
                <div
                  className="stats-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.round((detail.count / detail.goal) * 100))}%`,
                  }}
                />
              </div>
              {petitionGoalReached(detail) ? (
                <p className="banner success">{t.petitions.goalReached}</p>
              ) : (
                <p className="hint">
                  {t.petitions.needMore.replace(
                    '{n}',
                    String(Math.max(0, detail.goal - detail.count)),
                  )}
                </p>
              )}
            </div>

            <div className="petition-share-card">
              <p className="cell-meta-label">{t.petitions.sharePreview}</p>
              <pre className="petition-share-preview">
                {buildWhatsAppShareText(detail, t.appName)}
              </pre>
              <button
                type="button"
                className="primary"
                onClick={() => openWhatsAppShare(detail, t.appName)}
              >
                {t.petitions.shareWhatsApp}
              </button>
            </div>

            {hasSignedPetition(detail.id) ? (
              <p className="banner success">{t.petitions.signed}</p>
            ) : (
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => void onSign(detail)}
              >
                {t.petitions.sign}
              </button>
            )}

            <button
              type="button"
              className="secondary"
              disabled={!petitionGoalReached(detail)}
              onClick={() => downloadPetitionPack(detail, t.appName)}
            >
              {t.petitions.download}
            </button>

            {!isNationalPetition(detail) ? (
              <button
                type="button"
                className="secondary"
                onClick={() => onOpenOnMap(detail.grid_key)}
              >
                {t.petitions.viewOnMap}
              </button>
            ) : null}

            <button type="button" className="linkish" onClick={() => void onFlag(detail)}>
              {t.petitions.flag}
            </button>
          </div>
        ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
