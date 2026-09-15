import { useMemo, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { DEFAULT_PETITION_GOAL } from '../lib/device'
import {
  buildWhatsAppShareText,
  createPetition,
  downloadPetitionPack,
  flagPetition,
  hasSignedPetition,
  openWhatsAppShare,
  petitionGoalReached,
  signPetition,
} from '../lib/petitions'
import type { AreaPetition } from '../types'

type Mode = 'list' | 'create' | 'detail'

type Props = {
  cellLat: number
  cellLng: number
  cellKey: string
  petitions: AreaPetition[]
  focusId?: string | null
  onChange: () => void
  onClose: () => void
}

export function PetitionSheet({
  cellLat,
  cellLng,
  cellKey,
  petitions,
  focusId,
  onChange,
  onClose,
}: Props) {
  const { t } = useI18n()
  const here = useMemo(
    () => petitions.filter((p) => p.grid_key === cellKey),
    [petitions, cellKey],
  )
  const [mode, setMode] = useState<Mode>(() => (focusId ? 'detail' : 'list'))
  const [selected, setSelected] = useState<AreaPetition | null>(() =>
    focusId ? petitions.find((p) => p.id === focusId) ?? null : null,
  )
  const [title, setTitle] = useState('')
  const [ask, setAsk] = useState('')
  const [goal, setGoal] = useState(DEFAULT_PETITION_GOAL)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const res = await createPetition({
      title,
      ask,
      scope: 'area',
      lat: cellLat,
      lng: cellLng,
      goal,
    })
    setBusy(false)
    if (!res.ok || !res.petition) {
      setStatus(t.petitions.needFields)
      return
    }
    setStatus(t.petitions.success)
    setTitle('')
    setAsk('')
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
    <div className="petition-sheet" role="dialog" aria-label={t.petitions.title}>
      <div className="missing-board-scrim" onClick={onClose} />
      <div className="missing-board-panel petition-panel">
        <div className="missing-board-bar">
          <strong>{t.petitions.title}</strong>
          <button type="button" className="linkish" onClick={onClose}>
            {t.petitions.close}
          </button>
        </div>

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
          <div>
            {here.length === 0 ? (
              <p className="hint">{t.petitions.empty}</p>
            ) : (
              <ul className="missing-list">
                {here.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="missing-row"
                      onClick={() => {
                        setSelected(p)
                        setMode('detail')
                      }}
                    >
                      <span>
                        <strong>{p.title}</strong>
                        <em>{p.ask}</em>
                        <small>
                          {t.petitions.progress
                            .replace('{count}', String(p.count))
                            .replace('{goal}', String(p.goal))}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="primary" onClick={() => setMode('create')}>
              {t.map.startPetition}
            </button>
          </div>
        ) : null}

        {mode === 'create' ? (
          <form className="form" onSubmit={onCreate}>
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
            <button type="submit" className="primary" disabled={busy}>
              {busy ? t.petitions.creating : t.petitions.create}
            </button>
          </form>
        ) : null}

        {mode === 'detail' && detail ? (
          <div className="petition-detail">
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
            <h2>{detail.title}</h2>
            <p>{detail.ask}</p>
            <div className="petition-progress panel">
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

            <div className="petition-share-card panel">
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

            <button type="button" className="linkish" onClick={() => void onFlag(detail)}>
              {t.petitions.flag}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
