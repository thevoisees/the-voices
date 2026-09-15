import { useMemo, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import {
  createAnnouncement,
  flagAnnouncement,
  hasFlaggedAnnouncement,
  openAnnouncementWhatsApp,
} from '../lib/announcements'
import type {
  AnnouncementKind,
  AnnouncementVoice,
  CommunityAnnouncement,
} from '../types'

type Props = {
  announcements: CommunityAnnouncement[]
  onChange: () => void
}

type Mode = 'list' | 'create' | 'detail'

export function AnnouncementsSection({ announcements, onChange }: Props) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('list')
  const [selected, setSelected] = useState<CommunityAnnouncement | null>(null)
  const [kindFilter, setKindFilter] = useState<AnnouncementKind | 'all'>('all')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<AnnouncementKind>('march')
  const [voice, setVoice] = useState<AnnouncementVoice>('group')
  const [organizer, setOrganizer] = useState('')
  const [whenText, setWhenText] = useState('')
  const [whereText, setWhereText] = useState('')
  const [joinNote, setJoinNote] = useState('')

  const filtered = useMemo(() => {
    if (kindFilter === 'all') return announcements
    return announcements.filter((a) => a.kind === kindFilter)
  }, [announcements, kindFilter])

  function kindLabel(k: AnnouncementKind): string {
    if (k === 'march') return t.announcements.kindMarch
    if (k === 'prayer') return t.announcements.kindPrayer
    if (k === 'meeting') return t.announcements.kindMeeting
    if (k === 'vigil') return t.announcements.kindVigil
    return t.announcements.kindOther
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setStatus(null)
    setBusy(true)
    const res = await createAnnouncement({
      title,
      body,
      kind,
      voice,
      organizer,
      when_text: whenText,
      where_text: whereText,
      join_note: joinNote || null,
    })
    setBusy(false)
    if (!res.ok || !res.announcement) {
      setStatus(t.announcements.needFields)
      return
    }
    setStatus(t.announcements.success)
    setTitle('')
    setBody('')
    setOrganizer('')
    setWhenText('')
    setWhereText('')
    setJoinNote('')
    onChange()
    setSelected(res.announcement)
    setMode('detail')
  }

  async function onFlag(id: string) {
    if (hasFlaggedAnnouncement(id)) {
      setStatus(t.map.flagAlready)
      return
    }
    const res = await flagAnnouncement(id)
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
    ? announcements.find((a) => a.id === selected.id) ?? selected
    : null

  return (
    <div className="announcements-section">
      <header className="announce-head">
        <h2>{t.announcements.title}</h2>
        <p className="hint">{t.announcements.lead}</p>
        <p className="banner warn">{t.announcements.warn}</p>
      </header>

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
          {t.announcements.tabList}
        </button>
        <button
          type="button"
          className={mode === 'create' ? 'chip on' : 'chip'}
          onClick={() => setMode('create')}
        >
          {t.announcements.tabCreate}
        </button>
      </div>

      {mode === 'list' && !detail ? (
        <>
          <div className="chip-row">
            <button
              type="button"
              className={kindFilter === 'all' ? 'chip on' : 'chip'}
              onClick={() => setKindFilter('all')}
            >
              {t.announcements.filterAll}
            </button>
            {(
              [
                ['march', t.announcements.kindMarch],
                ['prayer', t.announcements.kindPrayer],
                ['meeting', t.announcements.kindMeeting],
                ['vigil', t.announcements.kindVigil],
                ['other', t.announcements.kindOther],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                className={kindFilter === v ? 'chip on' : 'chip'}
                onClick={() => setKindFilter(v)}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="hint panel petitions-empty">{t.announcements.empty}</p>
          ) : (
            <ul className="petition-page-list">
              {filtered.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="petition-page-card panel announce-card"
                    onClick={() => {
                      setSelected(a)
                      setMode('detail')
                    }}
                  >
                    <span className="petition-scope-tag announce-kind-tag">
                      {kindLabel(a.kind)}
                    </span>
                    <strong>{a.title}</strong>
                    <em>{a.body}</em>
                    <small>
                      {a.voice === 'group'
                        ? t.announcements.byGroup.replace('{name}', a.organizer)
                        : t.announcements.byIndividual.replace('{name}', a.organizer)}
                      {' · '}
                      {a.when_text}
                      {' · '}
                      {a.where_text}
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
            <legend>{t.announcements.voiceLabel}</legend>
            <label className="check">
              <input
                type="radio"
                name="voice"
                checked={voice === 'group'}
                onChange={() => setVoice('group')}
              />
              <span>
                <strong>{t.announcements.voiceGroup}</strong>
                <em>{t.announcements.voiceGroupHint}</em>
              </span>
            </label>
            <label className="check">
              <input
                type="radio"
                name="voice"
                checked={voice === 'individual'}
                onChange={() => setVoice('individual')}
              />
              <span>
                <strong>{t.announcements.voiceIndividual}</strong>
                <em>{t.announcements.voiceIndividualHint}</em>
              </span>
            </label>
          </fieldset>

          <label>
            {t.announcements.organizer}
            <input
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              required
              maxLength={80}
              placeholder={
                voice === 'group'
                  ? t.announcements.organizerGroupPlaceholder
                  : t.announcements.organizerSoloPlaceholder
              }
            />
          </label>

          <label>
            {t.announcements.kindLabel}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AnnouncementKind)}
            >
              <option value="march">{t.announcements.kindMarch}</option>
              <option value="prayer">{t.announcements.kindPrayer}</option>
              <option value="meeting">{t.announcements.kindMeeting}</option>
              <option value="vigil">{t.announcements.kindVigil}</option>
              <option value="other">{t.announcements.kindOther}</option>
            </select>
          </label>

          <label>
            {t.announcements.titleField}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={80}
              placeholder={t.announcements.titlePlaceholder}
            />
          </label>

          <label>
            {t.announcements.bodyField}
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={280}
              placeholder={t.announcements.bodyPlaceholder}
            />
          </label>

          <label>
            {t.announcements.whenField}
            <input
              value={whenText}
              onChange={(e) => setWhenText(e.target.value)}
              required
              maxLength={120}
              placeholder={t.announcements.whenPlaceholder}
            />
          </label>

          <label>
            {t.announcements.whereField}
            <input
              value={whereText}
              onChange={(e) => setWhereText(e.target.value)}
              required
              maxLength={120}
              placeholder={t.announcements.wherePlaceholder}
            />
          </label>

          <label>
            {t.announcements.joinField}
            <input
              value={joinNote}
              onChange={(e) => setJoinNote(e.target.value)}
              maxLength={120}
              placeholder={t.announcements.joinPlaceholder}
            />
          </label>
          <p className="hint">{t.announcements.joinHint}</p>

          <button type="submit" className="primary" disabled={busy}>
            {busy ? t.announcements.publishing : t.announcements.publish}
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
            ← {t.announcements.tabList}
          </button>
          <span className="petition-scope-tag announce-kind-tag">
            {kindLabel(detail.kind)}
          </span>
          <h2>{detail.title}</h2>
          <p>{detail.body}</p>
          <dl className="announce-dl">
            <div>
              <dt>{t.announcements.organizer}</dt>
              <dd>
                {detail.voice === 'group'
                  ? t.announcements.byGroup.replace('{name}', detail.organizer)
                  : t.announcements.byIndividual.replace('{name}', detail.organizer)}
              </dd>
            </div>
            <div>
              <dt>{t.announcements.whenField}</dt>
              <dd>{detail.when_text}</dd>
            </div>
            <div>
              <dt>{t.announcements.whereField}</dt>
              <dd>{detail.where_text}</dd>
            </div>
            {detail.join_note ? (
              <div>
                <dt>{t.announcements.joinField}</dt>
                <dd>{detail.join_note}</dd>
              </div>
            ) : null}
          </dl>

          <button
            type="button"
            className="primary"
            onClick={() => openAnnouncementWhatsApp(detail, t.appName)}
          >
            {t.announcements.shareWhatsApp}
          </button>

          {!hasFlaggedAnnouncement(detail.id) ? (
            <button
              type="button"
              className="linkish"
              onClick={() => void onFlag(detail.id)}
            >
              {t.announcements.flag}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
