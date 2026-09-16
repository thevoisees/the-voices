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
  updateMissingPerson,
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

function statusTone(p: MissingPerson) {
  if (p.status === 'found_alive') return 'alive'
  if (p.status === 'found_dead') return 'dead'
  return 'missing'
}

function genderLabel(
  gender: AffectedGender | null | undefined,
  t: ReturnType<typeof useI18n>['t'],
) {
  if (!gender) return null
  if (gender === 'woman') return t.report.genderWoman
  if (gender === 'man') return t.report.genderMan
  if (gender === 'girl') return t.report.genderGirl
  if (gender === 'boy') return t.report.genderBoy
  return t.report.genderUnknown
}

const FRAME_DESC_CHARS = 110

function frameDescription(text: string | null | undefined) {
  const body = (text ?? '').trim()
  if (!body) return null
  if (body.length <= FRAME_DESC_CHARS) return body
  return `${body.slice(0, FRAME_DESC_CHARS).replace(/\s+\S*$/, '').trim()}…`
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
  const [editing, setEditing] = useState(false)
  const [editPhoto, setEditPhoto] = useState<string | null>(null)

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

  useEffect(() => {
    if (!selected) {
      setEditing(false)
      setEditPhoto(null)
      return
    }
    if (editing) return
    const fresh = people.find((p) => p.id === selected.id)
    if (fresh) setSelected(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refresh detail when list data changes
  }, [people, selected?.id, editing])

  function startEdit() {
    if (!selected) return
    setName(selected.name)
    setGender(selected.gender ?? '')
    setAgeNote(selected.age_note ?? '')
    setPlace(selected.last_seen_place)
    setDate(selected.last_seen_date ?? '')
    setDesc(selected.description ?? '')
    setContact(selected.contact_note ?? '')
    setLat(selected.grid_lat)
    setLng(selected.grid_lng)
    setEditPhoto(null)
    setEditing(true)
    setStatus(null)
  }

  function cancelEdit() {
    setEditing(false)
    setEditPhoto(null)
    setStatus(null)
  }

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

  async function onEditPhoto(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const url = await prepareMissingPhoto(file)
      setEditPhoto(url)
    } catch {
      setStatus(t.missing.photoFail)
    }
    setBusy(false)
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    setStatus(null)
    setBusy(true)
    const res = await updateMissingPerson(selected.id, {
      name,
      photoDataUrl: editPhoto,
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
      setStatus(res.error === 'need_fields' ? t.missing.editNeedFields : t.missing.editFail)
      return
    }
    setSelected(res.person)
    setEditing(false)
    setEditPhoto(null)
    setStatus(t.missing.editSuccess)
    onChange()
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

  const shareTone = selected ? statusTone(selected) : 'missing'
  const shareDesc = selected ? frameDescription(selected.description) : null
  const shareMeta = selected
    ? [selected.age_note, genderLabel(selected.gender, t)].filter(Boolean).join(' · ')
    : ''
  const shareFullDesc = (selected?.description ?? '').trim()
  const shareShowExtra = shareFullDesc.length > FRAME_DESC_CHARS

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
                {filtered.map((p) => {
                  const tone = statusTone(p)
                  const meta = [p.age_note, genderLabel(p.gender, t)]
                    .filter(Boolean)
                    .join(' · ')
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`missing-card tone-${tone}`}
                        onClick={() => setSelected(p)}
                      >
                        <div className="missing-card-photo">
                          <img src={resolvePhotoUrl(p.photo)} alt="" />
                          <span className={`missing-card-badge tone-${tone}`}>
                            {tone === 'missing'
                              ? t.missing.shareMissing
                              : statusLabel(p, t)}
                          </span>
                        </div>
                        <span className="missing-card-body">
                          <strong>{p.name}</strong>
                          {meta ? <em>{meta}</em> : null}
                          <small>
                            {p.last_seen_place}
                            {p.last_seen_date ? ` · ${p.last_seen_date}` : ''}
                          </small>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : null}

        {tab === 'list' && selected ? (
          <div className="missing-detail">
            <button
              type="button"
              className="linkish"
              onClick={() => {
                cancelEdit()
                setSelected(null)
              }}
            >
              ← {t.missing.back}
            </button>

            {editing ? (
              <form className="form missing-form" onSubmit={(e) => void onSaveEdit(e)}>
                <p className="banner warn">{t.missing.editWarn}</p>

                <div className="missing-detail-hero">
                  <img
                    src={editPhoto || resolvePhotoUrl(selected.photo)}
                    alt={selected.name}
                  />
                </div>

                <label>
                  {t.missing.photoReplace}
                  <input
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                    onChange={(e) => void onEditPhoto(e.target.files?.[0])}
                  />
                </label>

                <label>
                  {t.missing.name}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={80}
                  />
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
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    maxLength={80}
                    placeholder={t.missing.datePlaceholder}
                  />
                  <span className="hint">{t.missing.lastSeenDateHint}</span>
                </label>

                <fieldset>
                  <legend>{t.missing.markMap}</legend>
                  <div className="mini-map">
                    <MapContainer
                      center={
                        lat != null && lng != null ? [lat, lng] : [-26.1, 28.22]
                      }
                      zoom={11}
                      className="leaflet-mini"
                    >
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
                            color: '#0f766e',
                            fillColor: '#14b8a6',
                            fillOpacity: 0.9,
                          }}
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
                  <button type="button" className="secondary" onClick={cancelEdit}>
                    {t.missing.editCancel}
                  </button>
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? t.missing.editSaving : t.missing.editSave}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="shot-hint missing-shot-hint">{t.missing.shotHint}</p>

                <article
                  className={`missing-share tone-${shareTone}`}
                  aria-label={`${t.missing.shareMissing}: ${selected.name}`}
                >
                  <div className="missing-share-inner">
                    <header className="missing-share-top">
                      <div className="missing-share-brand">{t.missing.shareBrand}</div>
                      <span className={`missing-share-status tone-${shareTone}`}>
                        {shareTone === 'missing'
                          ? t.missing.shareMissing
                          : statusLabel(selected, t)}
                      </span>
                    </header>

                    <div className="missing-share-photo">
                      <img
                        src={resolvePhotoUrl(selected.photo)}
                        alt={selected.name}
                      />
                    </div>

                    <div className="missing-share-copy">
                      <h2>{selected.name}</h2>
                      {shareMeta ? (
                        <p className="missing-share-meta">{shareMeta}</p>
                      ) : null}
                      <p className="missing-share-seen">
                        <span>{t.missing.lastSeen}</span>
                        {selected.last_seen_place}
                        {selected.last_seen_date
                          ? ` · ${selected.last_seen_date}`
                          : ''}
                      </p>
                      {shareDesc ? (
                        <p className="missing-share-desc">{shareDesc}</p>
                      ) : null}
                    </div>

                    <footer className="missing-share-foot">
                      <span>{t.missing.shareHelp}</span>
                      <span className="missing-share-tag">{t.missing.shareTag}</span>
                    </footer>
                  </div>
                </article>

                {shareShowExtra || selected.contact_note ? (
                  <dl className="missing-dl missing-dl-extra">
                    {shareShowExtra ? (
                      <div>
                        <dt>{t.missing.description}</dt>
                        <dd>{shareFullDesc}</dd>
                      </div>
                    ) : null}
                    {selected.contact_note ? (
                      <div>
                        <dt>{t.missing.contact}</dt>
                        <dd>{selected.contact_note}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}

                <div className="missing-detail-actions">
                  <button type="button" className="secondary" onClick={startEdit}>
                    {t.missing.edit}
                  </button>

                  {selected.status === 'missing' ? (
                    <div className="missing-verify panel">
                      <h3>{t.missing.verifyTitle}</h3>
                      <p className="hint">
                        {t.missing.verifyLead.replace(
                          '{n}',
                          String(MISSING_VERIFY_THRESHOLD),
                        )}
                      </p>
                      <p className="missing-verify-counts">
                        {t.missing.votesAlive}:{' '}
                        <strong>{selected.verify_alive}</strong>
                        {' · '}
                        {t.missing.votesDead}:{' '}
                        <strong>{selected.verify_dead}</strong>
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
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => void onFlag()}
                    >
                      {t.missing.flag}
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : null}

        {tab === 'report' ? (
          <form className="form missing-form" onSubmit={onSubmit}>
            <p className="banner warn">{t.missing.reportWarn}</p>

            <label>
              {t.missing.photo}
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
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
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                maxLength={80}
                placeholder={t.missing.datePlaceholder}
              />
              <span className="hint">{t.missing.lastSeenDateHint}</span>
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
