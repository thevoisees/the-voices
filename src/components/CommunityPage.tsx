import { useMemo, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import {
  createForum,
  flagForum,
  hasFlaggedForum,
} from '../lib/forums'
import { resolvePhotoUrl } from '../lib/missing'
import {
  closeSearch,
  flagSearch,
  hasFlaggedSearch,
  hasJoinedSquad,
  joinSquad,
} from '../lib/searches'
import type {
  NeighborhoodForum,
  SearchCall,
  SearchStatus,
} from '../types-community'
import type { MissingPerson } from '../types-missing'

type Props = {
  forums: NeighborhoodForum[]
  searches: SearchCall[]
  missingPeople: MissingPerson[]
  onForumsChange: () => void
  onSearchesChange: () => void
  initialTab?: 'forums' | 'searches'
  focusSearchId?: string | null
}

type HubTab = 'forums' | 'searches'

function statusLabel(
  status: SearchStatus,
  t: ReturnType<typeof useI18n>['t'],
) {
  if (status === 'active') return t.community.searchStatusActive
  if (status === 'closed') return t.community.searchStatusClosed
  return t.community.searchStatusRecruiting
}

export function CommunityPage({
  forums,
  searches,
  missingPeople,
  onForumsChange,
  onSearchesChange,
  initialTab = 'forums',
  focusSearchId = null,
}: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<HubTab>(initialTab)
  const [selectedForum, setSelectedForum] = useState<NeighborhoodForum | null>(
    null,
  )
  const [selectedSearch, setSelectedSearch] = useState<SearchCall | null>(
    () =>
      (focusSearchId && searches.find((s) => s.id === focusSearchId)) || null,
  )
  const [creatingForum, setCreatingForum] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const [fname, setFname] = useState('')
  const [farea, setFarea] = useState('')
  const [fconvenor, setFconvenor] = useState('')
  const [fcontact, setFcontact] = useState('')
  const [fassociates, setFassociates] = useState('')
  const [fabout, setFabout] = useState('')
  const [fwhat, setFwhat] = useState('')

  const personById = useMemo(() => {
    const m = new Map<string, MissingPerson>()
    for (const p of missingPeople) m.set(p.id, p)
    return m
  }, [missingPeople])

  const openSearches = useMemo(
    () =>
      searches.filter(
        (s) => s.status === 'recruiting' || s.status === 'active',
      ),
    [searches],
  )

  const liveSearch =
    selectedSearch &&
    (searches.find((s) => s.id === selectedSearch.id) ?? selectedSearch)

  async function onCreateForum(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const res = await createForum({
      name: fname,
      area_text: farea,
      convenor_name: fconvenor,
      convenor_contact: fcontact,
      associates_text: fassociates || null,
      about: fabout || null,
      what_we_do: fwhat || null,
    })
    setBusy(false)
    if (!res.ok) {
      setStatus(t.community.forumNeedFields)
      return
    }
    setFname('')
    setFarea('')
    setFconvenor('')
    setFcontact('')
    setFassociates('')
    setFabout('')
    setFwhat('')
    setCreatingForum(false)
    setStatus(t.community.forumSuccess)
    if (res.forum) setSelectedForum(res.forum)
    onForumsChange()
  }

  async function onFlagForum(id: string) {
    setBusy(true)
    const res = await flagForum(id)
    setBusy(false)
    if (res.ok) {
      setStatus(t.community.forumFlagThanks)
      if (res.hidden) setSelectedForum(null)
      onForumsChange()
    }
  }

  async function onJoin(searchId: string, squadId: string) {
    setBusy(true)
    const res = await joinSquad(searchId, squadId)
    setBusy(false)
    if (!res.ok) {
      setStatus(
        res.error === 'already'
          ? t.community.searchJoined
          : res.error === 'closed'
            ? t.community.searchClosed
            : t.community.forumNeedFields,
      )
      return
    }
    if (res.search) setSelectedSearch(res.search)
    setStatus(t.community.searchJoined)
    onSearchesChange()
  }

  async function onCloseSearch(id: string) {
    setBusy(true)
    const res = await closeSearch(id)
    setBusy(false)
    if (res.search) setSelectedSearch(res.search)
    onSearchesChange()
  }

  async function onFlagSearch(id: string) {
    setBusy(true)
    const res = await flagSearch(id)
    setBusy(false)
    if (res.ok) {
      setStatus(t.community.searchFlagThanks)
      if (res.hidden) setSelectedSearch(null)
      onSearchesChange()
    }
  }

  return (
    <div className="community-page">
      <header className="page-head">
        <h1>{t.community.title}</h1>
        <p className="hint">{t.community.lead}</p>
      </header>

      <div className="chip-row">
        <button
          type="button"
          className={tab === 'forums' ? 'chip on' : 'chip'}
          onClick={() => {
            setTab('forums')
            setSelectedSearch(null)
          }}
        >
          {t.community.tabForums}
        </button>
        <button
          type="button"
          className={tab === 'searches' ? 'chip on' : 'chip'}
          onClick={() => {
            setTab('searches')
            setSelectedForum(null)
          }}
        >
          {t.community.tabSearches}
          {openSearches.length ? ` (${openSearches.length})` : ''}
        </button>
      </div>

      {status ? <p className="banner info">{status}</p> : null}

      {tab === 'forums' && !selectedForum ? (
        <div className="community-section">
          {!creatingForum ? (
            <button
              type="button"
              className="primary"
              onClick={() => setCreatingForum(true)}
            >
              {t.community.forumsCreate}
            </button>
          ) : (
            <form className="form" onSubmit={(e) => void onCreateForum(e)}>
              <label>
                {t.community.forumName}
                <input
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  required
                  maxLength={80}
                  placeholder={t.community.forumNamePlaceholder}
                />
              </label>
              <label>
                {t.community.forumArea}
                <input
                  value={farea}
                  onChange={(e) => setFarea(e.target.value)}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                {t.community.forumConvenor}
                <input
                  value={fconvenor}
                  onChange={(e) => setFconvenor(e.target.value)}
                  required
                  maxLength={80}
                />
              </label>
              <label>
                {t.community.forumContact}
                <input
                  value={fcontact}
                  onChange={(e) => setFcontact(e.target.value)}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                {t.community.forumAssociates}
                <textarea
                  rows={2}
                  maxLength={400}
                  value={fassociates}
                  onChange={(e) => setFassociates(e.target.value)}
                  placeholder={t.community.forumAssociatesPlaceholder}
                />
              </label>
              <label>
                {t.community.forumAbout}
                <textarea
                  rows={2}
                  maxLength={280}
                  value={fabout}
                  onChange={(e) => setFabout(e.target.value)}
                />
              </label>
              <label>
                {t.community.forumWhatWeDo}
                <textarea
                  rows={2}
                  maxLength={280}
                  value={fwhat}
                  onChange={(e) => setFwhat(e.target.value)}
                  placeholder={t.community.forumWhatPlaceholder}
                />
              </label>
              <div className="draft-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setCreatingForum(false)}
                >
                  {t.community.forumsCancel}
                </button>
                <button type="submit" className="primary" disabled={busy}>
                  {busy
                    ? t.community.forumSubmitting
                    : t.community.forumSubmit}
                </button>
              </div>
            </form>
          )}

          {forums.length === 0 ? (
            <p className="hint">{t.community.forumsEmpty}</p>
          ) : (
            <ul className="community-list">
              {forums.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="community-row"
                    onClick={() => setSelectedForum(f)}
                  >
                    <strong>{f.name}</strong>
                    <em>{f.area_text}</em>
                    <small>
                      {f.convenor_name} · {f.convenor_contact}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === 'forums' && selectedForum ? (
        <div className="community-detail">
          <button
            type="button"
            className="linkish"
            onClick={() => setSelectedForum(null)}
          >
            ← {t.community.forumBack}
          </button>
          <h2>{selectedForum.name}</h2>
          <p className="community-area">{selectedForum.area_text}</p>
          {selectedForum.about ? <p>{selectedForum.about}</p> : null}
          {selectedForum.what_we_do ? (
            <p>
              <strong>{t.community.forumWhatWeDo}:</strong>{' '}
              {selectedForum.what_we_do}
            </p>
          ) : null}
          <dl className="missing-dl">
            <div>
              <dt>{t.community.forumContactLabel}</dt>
              <dd>
                {selectedForum.convenor_name} · {selectedForum.convenor_contact}
              </dd>
            </div>
            {selectedForum.associates_text ? (
              <div>
                <dt>{t.community.forumAssociatesLabel}</dt>
                <dd>{selectedForum.associates_text}</dd>
              </div>
            ) : null}
          </dl>
          <p className="hint">{t.community.forumStartSearch}</p>
          {!hasFlaggedForum(selectedForum.id) ? (
            <button
              type="button"
              className="linkish"
              disabled={busy}
              onClick={() => void onFlagForum(selectedForum.id)}
            >
              {t.community.forumFlag}
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === 'searches' && !liveSearch ? (
        <div className="community-section">
          {searches.length === 0 ? (
            <p className="hint">{t.community.searchesEmpty}</p>
          ) : (
            <ul className="community-list">
              {searches.map((s) => {
                const person = personById.get(s.person_id)
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="community-row search-row"
                      onClick={() => setSelectedSearch(s)}
                    >
                      {person ? (
                        <img
                          src={resolvePhotoUrl(person.photo)}
                          alt=""
                          className="search-row-face"
                        />
                      ) : null}
                      <span>
                        <strong>
                          {person?.name ?? t.community.searchLookingFor}
                        </strong>
                        <em>{s.area_text}</em>
                        <small>
                          {statusLabel(s.status, t)} · {s.when_text}
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

      {tab === 'searches' && liveSearch ? (
        <div className="community-detail search-detail">
          <button
            type="button"
            className="linkish"
            onClick={() => setSelectedSearch(null)}
          >
            ← {t.community.searchBack}
          </button>

          {(() => {
            const person = personById.get(liveSearch.person_id)
            return (
              <div className="search-poster">
                {person ? (
                  <img
                    src={resolvePhotoUrl(person.photo)}
                    alt={person.name}
                  />
                ) : null}
                <div>
                  <p className="search-status-pill">
                    {statusLabel(liveSearch.status, t)}
                  </p>
                  <h2>
                    {t.community.searchLookingFor}
                    {person ? `: ${person.name}` : ''}
                  </h2>
                  <p>
                    <strong>{t.community.searchAreaLabel}:</strong>{' '}
                    {liveSearch.area_text}
                  </p>
                  <p>
                    <strong>{t.community.searchWhenLabel}:</strong>{' '}
                    {liveSearch.when_text}
                  </p>
                  {liveSearch.marshal_name || liveSearch.marshal_contact ? (
                    <p>
                      <strong>{t.community.searchMarshalLabel}:</strong>{' '}
                      {[liveSearch.marshal_name, liveSearch.marshal_contact]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })()}

          <h3>{t.community.searchGuidanceTitle}</h3>
          <p className="hint">
            {liveSearch.guidance || t.missing.searchGuidanceDefault}
          </p>

          <h3>{t.community.searchSquadsTitle}</h3>
          <ul className="squad-list">
            {liveSearch.squads.map((sq) => (
              <li key={sq.id} className="squad-card">
                <strong>{sq.label}</strong>
                <p>
                  {sq.meet_place} · {sq.meet_when}
                </p>
                {sq.marshal_name || sq.marshal_contact ? (
                  <p className="hint">
                    {t.community.searchMarshalLabel}:{' '}
                    {[sq.marshal_name, sq.marshal_contact]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
                <p className="squad-count">
                  {sq.join_count} {t.community.searchJoiners}
                </p>
                {liveSearch.status === 'closed' ? (
                  <p className="hint">{t.community.searchClosed}</p>
                ) : hasJoinedSquad(sq.id) ? (
                  <p className="banner success">{t.community.searchJoined}</p>
                ) : (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => void onJoin(liveSearch.id, sq.id)}
                  >
                    {t.community.searchJoin}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {liveSearch.status !== 'closed' ? (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => void onCloseSearch(liveSearch.id)}
            >
              {t.community.searchClose}
            </button>
          ) : null}

          {!hasFlaggedSearch(liveSearch.id) ? (
            <button
              type="button"
              className="linkish"
              disabled={busy}
              onClick={() => void onFlagSearch(liveSearch.id)}
            >
              {t.community.searchFlag}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
