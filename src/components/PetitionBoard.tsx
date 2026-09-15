import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { peekPlaceName } from '../lib/placename'
import { petitionGoalReached } from '../lib/petitions'
import type { AreaPetition } from '../types'

type Props = {
  petitions: AreaPetition[]
  onClose: () => void
  onSelect: (petition: AreaPetition) => void
  onStartHere?: () => void
  canStartHere?: boolean
}

export function PetitionBoard({
  petitions,
  onClose,
  onSelect,
  onStartHere,
  canStartHere,
}: Props) {
  const { t } = useI18n()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = [...petitions].sort((a, b) => b.count - a.count)
    if (!needle) return list
    return list.filter((p) => {
      const place = peekPlaceName(p.grid_lat, p.grid_lng)?.toLowerCase() ?? ''
      return (
        p.title.toLowerCase().includes(needle) ||
        p.ask.toLowerCase().includes(needle) ||
        place.includes(needle)
      )
    })
  }, [petitions, q])

  return (
    <div className="petition-sheet" role="dialog" aria-label={t.petitions.boardTitle}>
      <div className="missing-board-scrim" onClick={onClose} />
      <div className="missing-board-panel petition-panel">
        <div className="missing-board-bar">
          <strong>{t.petitions.boardTitle}</strong>
          <button type="button" className="linkish" onClick={onClose}>
            {t.petitions.close}
          </button>
        </div>

        <p className="hint">{t.petitions.boardLead}</p>

        <label className="petition-search">
          <span className="sr-only">{t.petitions.search}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.petitions.search}
          />
        </label>

        {canStartHere && onStartHere ? (
          <button type="button" className="primary" onClick={onStartHere}>
            {t.map.startPetition}
          </button>
        ) : (
          <p className="hint">{t.petitions.needSpot}</p>
        )}

        {filtered.length === 0 ? (
          <p className="hint">{t.petitions.boardEmpty}</p>
        ) : (
          <ul className="missing-list petition-board-list">
            {filtered.map((p) => {
              const place = peekPlaceName(p.grid_lat, p.grid_lng)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className="missing-row petition-board-row"
                    onClick={() => onSelect(p)}
                  >
                    <span>
                      <strong>{p.title}</strong>
                      <em>{p.ask}</em>
                      <small>
                        {place ? `${place} · ` : ''}
                        {t.petitions.progress
                          .replace('{count}', String(p.count))
                          .replace('{goal}', String(p.goal))}
                        {petitionGoalReached(p) ? ` · ${t.petitions.goalReached}` : ''}
                      </small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
