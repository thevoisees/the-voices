import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet'
import { useI18n } from '../i18n'
import {
  clearMissingDraft,
  loadMissingDraft,
  saveMissingDraft,
} from '../lib/drafts'
import { snapToGrid } from '../lib/grid'
import {
  disputeFound,
  flagMissing,
  hasDisputed,
  hasFlaggedMissing,
  hasVoted,
  prepareMissingPhoto,
  resolvePhotoUrl,
  submitMissingPerson,
  verifyFound,
} from '../lib/missing'
import type { AffectedGender } from '../types'
import type { FoundOutcome, MissingPerson } from '../types-missing'
import { MISSING_VERIFY_THRESHOLD } from '../types-missing'
import 'leaflet/dist/leaflet.css'

type Props = {
  people: MissingPerson[]
  onClose: () => void
  onChange: () => void
}

type Tab = 'list' | 'report'

type MissingDraft = {
  name: string
  gender: AffectedGender | ''
  ageNote: string
  place: string
  date: string
  desc: string
  contact: string
  lat: number | null
  lng: number | null
}

function PlacePicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const g = snapToGrid(e.latlng.lat, e.latlng.lng)
      onPick(g.lat, g.lng)
    },
  })
  return null
}

function statusLabel(p: MissingPerson, t: ReturnType<typeof useI18n>['t']) {
  if (p.status === 'found_alive') return t.missing.foundAlive
  if (p.status === 'found_dead') return t.missing.foundDead
  return t.missing.stillMissing
}

export function MissingBoard({ people, onClose, onChange }: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('list')
  const [selected, setSelected] = useState<MissingPerson | null>(null)
  const [filter, setFilter] = useState<'missing' | 'all' | 'found'>('missing')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [gender, setGender] = useState<AffectedGender | ''>('')
  const [ageNote, setAgeNote] = useState('')
  const [place, setPlace] = useState('')
  const [date, setDate] = useState('')
  const [desc, setDesc] = useState('')
  const [contact, setContact] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  useEffect(() => {
    const draft = loadMissingDraft<MissingDraft>()
    if (!draft) return
    setName(draft.name ?? '')
    setGender(draft.gender ?? '')
    setAgeNote(draft.ageNote ?? '')
    setPlace(draft.place ?? '')
    setDate(draft.date ?? '')
    setDesc(draft.desc ?? '')
    setContact(draft.contact ?? '')
    setLat(draft.lat ?? null)
    setLng(draft.lng ?? null)
    setStatus(t.drafts.restore)
  }, [t.drafts.restore])

  const filtered = useMemo(() => {
    return people.filter((p) => {
      if (p.hidden) return false
      if (filter === 'missing') return p.status === 'missing'
      if (filter === 'found') return p.status !== 'missing'
      return true
    })
  }, [people, filter])

  function persistDraft() {
    saveMissingDraft({
      name,
      gender,
      ageNote,
      place,
      date,
      desc,
      contact,
      lat,
      lng,
    } satisfies MissingDraft)
    setStatus(t.drafts.saved)
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const url = await prepareMissingPhoto(file)
      setPhoto(url)
    } catch {
      setStatus(t.missing.photoFail)
    }
    setBusy(false)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (!photo) {
      setStatus(t.missing.needPhoto)
      return
    }
    setBusy(true)
    const res = await submitMissingPerson({
      name,
      photoDataUrl: photo,
      gender: gender || null,
      age_note: ageNote || null,
      last_seen_place: place,
      last_seen_date: date || null,
      grid_lat: lat,
      grid_lng: lng,
      description: desc || null,
      contact_note: contact || null,
    })
    setBusy(false)
    if (!res.ok || !res.person) {
      setStatus(t.missing.needFields)
      return
    }
    clearMissingDraft()
    setStatus(t.missing.success)
    setName('')
    setPhoto(null)
    setPlace('')
    setDesc('')
    setContact('')
    setAgeNote('')
    setDate('')
    setGender('')
    setLat(null)
    setLng(null)
    onChange()
    setSelected(res.person)
    setTab('list')
  }

  async function onVerify(outcome: FoundOutcome) {
    if (!selected) return
    setBusy(true)
    const res = await verifyFound(selected.id, outcome)
    setBusy(false)
    if (!res.ok) {
      setStatus(
        res.error === 'already' ? t.missing.alreadyVoted : t.missing.verifyFail,
      )
      return
    }
    if (res.person) setSelected(res.person)
    setStatus(t.missing.verifyThanks)
    onChange()
  }

  async function onFlag() {
    if (!selected) return
    if (hasFlaggedMissing(selected.id)) {
      setStatus(t.missing.flagAlready)
      return
    }
    const res = await flagMissing(selected.id)
    if (!res.ok) {
      setStatus(t.missing.flagAlready)
      return
    }
    setStatus(res.hidden ? t.missing.flagHidden : t.missing.flagThanks)
    if (res.hidden) setSelected(null)
    onChange()
  }

  async function onDispute() {
    if (!selected) return
    if (hasDisputed(selected.id)) {
      setStatus(t.missing.disputeAlready)
      return
    }
    const res = await disputeFound(selected.id)
    if (!res.ok) {
      setStatus(
        res.error === 'already' ? t.missing.disputeAlready : t.missing.verifyFail,
      )
      return
    }
    if (res.person) {
      setSelected(res.person)
      setStatus(
        res.person.status === 'missing'
          ? t.missing.disputeReverted
          : t.missing.disputeThanks,
      )
    } else {
      setStatus(t.missing.disputeThanks)
    }
    onChange()
  }

  return (
    <div className="missing-board" role="dialog" aria-label={t.missing.title}>
      <div className="missing-board-scrim" onClick={onClose} />
      <div className="missing-board-panel">
        <div className="missing-board-bar">
          <strong>{t.missing.title}</strong>
          <button type="button" className="linkish" onClick={onClose}>
            {t.missing.close}
          </button>
        </div>

        <p className="hint missing-board-lead">{t.missing.lead}</p>

        <div className="chip-row missing-tabs">
          <button
            type="button"
            className={tab === 'list' ? 'chip on' : 'chip'}
            onClick={() => {
              setTab('list')
              setSelected(null)
            }}
          >
            {t.missing.tabList}
          </button>
          <button
            type="button"
            className={tab === 'report' ? 'chip on' : 'chip'}
            onClick={() => {
              setTab('report')
              setSelected(null)
            }}
          >
            {t.missing.tabReport}
          </button>
        </div>

        {status ? <p className="banner info">{status}</p> : null}

        {tab === 'list' && !selected ? (
          <div className="missing-list-wrap">
            <div className="chip-row">
              {(
                [
                  ['missing', t.missing.filterMissing],
                  ['found', t.missing.filterFound],
                  ['all', t.missing.filterAll],
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
            {filtered.length === 0 ? (
              <p className="hint">{t.missing.empty}</p>
            ) : (
              <ul className="missing-list">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="missing-row" onClick={() => setSelected(p)}>
                      <img src={resolvePhotoUrl(p.photo)} alt="" />
                      <span>
                        <strong>{p.name}</strong>
                        <em>{p.last_seen_place}</em>
                        <small>{statusLabel(p, t)}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === 'list' && selected ? (
          <div className="missing-detail">
            <button type="button" className="linkish" onClick={() => setSelected(null)}>
              ← {t.missing.back}
            </button>
            <div className="missing-detail-hero">
              <img src={resolvePhotoUrl(selected.photo)} alt={selected.name} />
              <div>
                <h2>{selected.name}</h2>
                <p className="missing-badge">{statusLabel(selected, t)}</p>
                {selected.age_note ? <p>{selected.age_note}</p> : null}
                {selected.gender ? (
                  <p>
                    {selected.gender === 'woman'
                      ? t.report.genderWoman
                      : selected.gender === 'man'
                        ? t.report.genderMan
                        : selected.gender === 'girl'
                          ? t.report.genderGirl
                          : selected.gender === 'boy'
                            ? t.report.genderBoy
                            : t.report.genderUnknown}
                  </p>
                ) : null}
              </div>
            </div>
            <dl className="missing-dl">
              <div>
                <dt>{t.missing.lastSeen}</dt>
                <dd>
                  {selected.last_seen_place}
                  {selected.last_seen_date ? ` · ${selected.last_seen_date}` : ''}
                </dd>
              </div>
              {selected.description ? (
                <div>
                  <dt>{t.missing.description}</dt>
                  <dd>{selected.description}</dd>
                </div>
              ) : null}
              {selected.contact_note ? (
                <div>
                  <dt>{t.missing.contact}</dt>
                  <dd>{selected.contact_note}</dd>
                </div>
              ) : null}
            </dl>

            {selected.status === 'missing' ? (
              <div className="missing-verify panel">
                <h3>{t.missing.verifyTitle}</h3>
                <p className="hint">
                  {t.missing.verifyLead.replace('{n}', String(MISSING_VERIFY_THRESHOLD))}
                </p>
                <p className="missing-verify-counts">
                  {t.missing.votesAlive}: <strong>{selected.verify_alive}</strong>
                  {' · '}
                  {t.missing.votesDead}: <strong>{selected.verify_dead}</strong>
                  {' / '}
                  {MISSING_VERIFY_THRESHOLD}
                </p>
                {hasVoted(selected.id) ? (
                  <p className="banner success">{t.missing.alreadyVoted}</p>
                ) : (
                  <div className="missing-verify-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={busy}
                      onClick={() => void onVerify('alive')}
                    >
                      {t.missing.voteAlive}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => void onVerify('dead')}
                    >
                      {t.missing.voteDead}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="missing-verify panel">
                {!hasDisputed(selected.id) ? (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => void onDispute()}
                  >
                    {t.missing.dispute}
                  </button>
                ) : (
                  <p className="banner info">{t.missing.disputeAlready}</p>
                )}
              </div>
            )}

            {!hasFlaggedMissing(selected.id) ? (
              <button type="button" className="linkish" onClick={() => void onFlag()}>
                {t.missing.flag}
              </button>
            ) : null}
          </div>
        ) : null}

        {tab === 'report' ? (
          <form className="form missing-form" onSubmit={onSubmit}>
            <p className="banner warn">{t.missing.reportWarn}</p>

            <label>
              {t.missing.photo}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => void onPhoto(e.target.files?.[0])}
              />
            </label>
            {photo ? (
              <img className="missing-preview" src={photo} alt="" />
            ) : null}

            <label>
              {t.missing.name}
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
            </label>

            <label>
              {t.report.gender}
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as AffectedGender | '')}
              >
                <option value="">{t.report.genderSkip}</option>
                <option value="woman">{t.report.genderWoman}</option>
                <option value="man">{t.report.genderMan}</option>
                <option value="girl">{t.report.genderGirl}</option>
                <option value="boy">{t.report.genderBoy}</option>
                <option value="unknown">{t.report.genderUnknown}</option>
              </select>
            </label>

            <label>
              {t.missing.ageNote}
              <input
                value={ageNote}
                onChange={(e) => setAgeNote(e.target.value)}
                maxLength={40}
                placeholder={t.missing.agePlaceholder}
              />
            </label>

            <label>
              {t.missing.lastSeen}
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                required
                maxLength={120}
                placeholder={t.missing.placePlaceholder}
              />
            </label>

            <label>
              {t.missing.lastSeenDate}
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>

            <fieldset>
              <legend>{t.missing.markMap}</legend>
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
                      pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.9 }}
                    />
                  ) : null}
                </MapContainer>
              </div>
            </fieldset>

            <label>
              {t.missing.description}
              <textarea
                rows={3}
                maxLength={400}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={t.missing.descPlaceholder}
              />
            </label>

            <label>
              {t.missing.contact}
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={120}
                placeholder={t.missing.contactPlaceholder}
              />
            </label>

            <div className="draft-actions">
              <button type="button" className="secondary" onClick={persistDraft}>
                {t.drafts.save}
              </button>
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  clearMissingDraft()
                  setStatus(t.drafts.clear)
                }}
              >
                {t.drafts.clear}
              </button>
            </div>

            <button type="submit" className="primary" disabled={busy}>
              {busy ? t.missing.submitting : t.missing.submit}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
