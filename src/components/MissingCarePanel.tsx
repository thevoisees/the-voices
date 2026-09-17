import { useEffect, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { createSearch } from '../lib/searches'
import {
  confirmSighting,
  fetchSightings,
  flagSighting,
  hasConfirmedSighting,
  hasFlaggedSighting,
  latestSighting,
  submitSighting,
} from '../lib/sightings'
import type { MissingSighting, NewSquadInput } from '../types-community'
import type { MissingPerson } from '../types-missing'

type Props = {
  person: MissingPerson
  onCareChange?: () => void
  /** Expose latest sighting upward for share frame */
  onLatestSighting?: (s: MissingSighting | null) => void
}

const emptySquad = (): NewSquadInput => ({
  label: '',
  meet_place: '',
  meet_when: '',
})

export function MissingCarePanel({
  person,
  onCareChange,
  onLatestSighting,
}: Props) {
  const { t } = useI18n()
  const [sightings, setSightings] = useState<MissingSighting[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const [place, setPlace] = useState('')
  const [when, setWhen] = useState('')
  const [note, setNote] = useState('')
  const [showSightingForm, setShowSightingForm] = useState(false)

  const [showSearchForm, setShowSearchForm] = useState(false)
  const [searchArea, setSearchArea] = useState(person.last_seen_place)
  const [searchWhen, setSearchWhen] = useState('')
  const [marshalName, setMarshalName] = useState('')
  const [marshalContact, setMarshalContact] = useState('')
  const [squads, setSquads] = useState<NewSquadInput[]>([emptySquad()])

  async function reload() {
    const list = await fetchSightings(person.id)
    setSightings(list)
    onLatestSighting?.(latestSighting(list))
  }

  useEffect(() => {
    void reload()
    setSearchArea(person.last_seen_place)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on person change
  }, [person.id])

  async function onAddSighting(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const res = await submitSighting({
      person_id: person.id,
      place_text: place,
      when_text: when,
      note: note || null,
    })
    setBusy(false)
    if (!res.ok) {
      setStatus(t.missing.sightingNeedFields)
      return
    }
    setPlace('')
    setWhen('')
    setNote('')
    setShowSightingForm(false)
    setStatus(t.missing.sightingSuccess)
    await reload()
    onCareChange?.()
  }

  async function onConfirm(id: string) {
    setBusy(true)
    const res = await confirmSighting(id)
    setBusy(false)
    if (!res.ok) {
      setStatus(
        res.error === 'already'
          ? t.missing.sightingConfirmed
          : t.missing.sightingNeedFields,
      )
      return
    }
    await reload()
    onCareChange?.()
  }

  async function onFlag(id: string) {
    setBusy(true)
    const res = await flagSighting(id)
    setBusy(false)
    if (!res.ok) {
      setStatus(
        res.error === 'already'
          ? t.missing.sightingFlagThanks
          : t.missing.sightingNeedFields,
      )
      return
    }
    setStatus(t.missing.sightingFlagThanks)
    await reload()
    onCareChange?.()
  }

  async function onOpenSearch(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const res = await createSearch({
      person_id: person.id,
      area_text: searchArea,
      when_text: searchWhen,
      guidance: t.missing.searchGuidanceDefault,
      grid_lat: person.grid_lat,
      grid_lng: person.grid_lng,
      marshal_name: marshalName || null,
      marshal_contact: marshalContact || null,
      squads: squads.filter(
        (s) => s.label.trim() && s.meet_place.trim() && s.meet_when.trim(),
      ),
    })
    setBusy(false)
    if (!res.ok) {
      setStatus(
        res.error === 'need_squad'
          ? t.missing.searchNeedSquad
          : t.missing.sightingNeedFields,
      )
      return
    }
    setShowSearchForm(false)
    setSquads([emptySquad()])
    setSearchWhen('')
    setMarshalName('')
    setMarshalContact('')
    setStatus(t.missing.searchSuccess)
    onCareChange?.()
  }

  return (
    <div className="missing-care">
      {status ? <p className="banner info">{status}</p> : null}

      <section className="missing-care-block panel">
        <h3>{t.missing.sightingsTitle}</h3>
        <p className="hint">{t.missing.sightingsLead}</p>

        {sightings.length === 0 ? (
          <p className="hint">{t.missing.sightingsEmpty}</p>
        ) : (
          <ul className="sighting-list">
            {sightings.map((s) => (
              <li key={s.id} className="sighting-item">
                <strong>
                  {s.place_text}
                  <span> · {s.when_text}</span>
                </strong>
                {s.note ? <p>{s.note}</p> : null}
                <p className="sighting-meta">
                  {s.confirm_count} {t.missing.sightingConfirms}
                </p>
                <div className="sighting-actions">
                  {hasConfirmedSighting(s.id) ? (
                    <span className="hint">{t.missing.sightingConfirmed}</span>
                  ) : (
                    <button
                      type="button"
                      className="linkish"
                      disabled={busy}
                      onClick={() => void onConfirm(s.id)}
                    >
                      {t.missing.sightingConfirm}
                    </button>
                  )}
                  {!hasFlaggedSighting(s.id) ? (
                    <button
                      type="button"
                      className="linkish"
                      disabled={busy}
                      onClick={() => void onFlag(s.id)}
                    >
                      {t.missing.sightingFlag}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {showSightingForm ? (
          <form className="form" onSubmit={(e) => void onAddSighting(e)}>
            <p className="banner warn">{t.missing.sightingWarn}</p>
            <label>
              {t.missing.sightingPlace}
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                required
                maxLength={120}
                placeholder={t.missing.placePlaceholder}
              />
            </label>
            <label>
              {t.missing.sightingWhen}
              <input
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                required
                maxLength={80}
                placeholder={t.missing.sightingWhenPlaceholder}
              />
            </label>
            <label>
              {t.missing.sightingNote}
              <textarea
                rows={2}
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.missing.sightingNotePlaceholder}
              />
            </label>
            <div className="draft-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowSightingForm(false)}
              >
                {t.missing.searchCancel}
              </button>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? t.missing.sightingSubmitting : t.missing.sightingSubmit}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="secondary"
            onClick={() => setShowSightingForm(true)}
          >
            {t.missing.sightingSubmit}
          </button>
        )}
      </section>

      {person.status === 'missing' ? (
        <section className="missing-care-block panel">
          <h3>{t.missing.openSearch}</h3>
          <p className="hint">{t.missing.openSearchLead}</p>

          {showSearchForm ? (
            <form className="form" onSubmit={(e) => void onOpenSearch(e)}>
              <label>
                {t.missing.searchArea}
                <input
                  value={searchArea}
                  onChange={(e) => setSearchArea(e.target.value)}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                {t.missing.searchWhen}
                <input
                  value={searchWhen}
                  onChange={(e) => setSearchWhen(e.target.value)}
                  required
                  maxLength={80}
                  placeholder={t.missing.sightingWhenPlaceholder}
                />
              </label>
              <label>
                {t.missing.searchMarshalName}
                <input
                  value={marshalName}
                  onChange={(e) => setMarshalName(e.target.value)}
                  maxLength={80}
                />
              </label>
              <label>
                {t.missing.searchMarshalContact}
                <input
                  value={marshalContact}
                  onChange={(e) => setMarshalContact(e.target.value)}
                  maxLength={120}
                />
              </label>

              {squads.map((sq, i) => (
                <fieldset key={i} className="search-squad-fields">
                  <legend>
                    {t.missing.searchSquadLabel} {i + 1}
                  </legend>
                  <label>
                    {t.missing.searchSquadLabel}
                    <input
                      value={sq.label}
                      onChange={(e) => {
                        const next = [...squads]
                        next[i] = { ...sq, label: e.target.value }
                        setSquads(next)
                      }}
                      required
                      maxLength={60}
                      placeholder="North / Taxi rank"
                    />
                  </label>
                  <label>
                    {t.missing.searchSquadPlace}
                    <input
                      value={sq.meet_place}
                      onChange={(e) => {
                        const next = [...squads]
                        next[i] = { ...sq, meet_place: e.target.value }
                        setSquads(next)
                      }}
                      required
                      maxLength={120}
                    />
                  </label>
                  <label>
                    {t.missing.searchSquadWhen}
                    <input
                      value={sq.meet_when}
                      onChange={(e) => {
                        const next = [...squads]
                        next[i] = { ...sq, meet_when: e.target.value }
                        setSquads(next)
                      }}
                      required
                      maxLength={80}
                    />
                  </label>
                  {squads.length > 1 ? (
                    <button
                      type="button"
                      className="linkish"
                      onClick={() =>
                        setSquads(squads.filter((_, j) => j !== i))
                      }
                    >
                      {t.missing.searchRemoveSquad}
                    </button>
                  ) : null}
                </fieldset>
              ))}

              <button
                type="button"
                className="linkish"
                onClick={() => setSquads([...squads, emptySquad()])}
              >
                {t.missing.searchAddSquad}
              </button>

              <p className="hint">{t.missing.searchGuidanceDefault}</p>

              <div className="draft-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowSearchForm(false)}
                >
                  {t.missing.searchCancel}
                </button>
                <button type="submit" className="primary" disabled={busy}>
                  {busy ? t.missing.searchSubmitting : t.missing.searchSubmit}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="primary"
              onClick={() => {
                const latest = latestSighting(sightings)
                if (latest) setSearchArea(latest.place_text)
                setShowSearchForm(true)
              }}
            >
              {t.missing.openSearch}
            </button>
          )}
        </section>
      ) : null}
    </div>
  )
}
