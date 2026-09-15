import { useI18n } from '../i18n'
import { isNationalPetition } from '../lib/petitions'
import { peekPlaceName } from '../lib/placename'
import type { AreaPetition } from '../types'

type Props = {
  petitions: AreaPetition[]
  onOpen: () => void
  onOpenOne?: (id: string) => void
}

export function PetitionStrip({ petitions, onOpen, onOpenOne }: Props) {
  const { t } = useI18n()
  const list = petitions.slice(0, 8)

  return (
    <div className="petition-strip">
      <div className="petition-strip-head">
        <strong>{t.petitions.stripTitle}</strong>
        <button type="button" className="linkish" onClick={onOpen}>
          {t.petitions.seeAll}
        </button>
      </div>
      {list.length === 0 ? (
        <button type="button" className="petition-strip-empty" onClick={onOpen}>
          {t.petitions.stripEmpty}
        </button>
      ) : (
        <ul className="petition-strip-list">
          {list.map((p) => {
            const place = isNationalPetition(p)
              ? t.petitions.scopeNational
              : p.place_label || peekPlaceName(p.grid_lat, p.grid_lng)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="petition-strip-item"
                  onClick={() => (onOpenOne ? onOpenOne(p.id) : onOpen())}
                >
                  <span className="petition-strip-title">{p.title}</span>
                  <span className="petition-strip-meta">
                    {place ? `${place} · ` : ''}
                    {p.count}/{p.goal}
                  </span>
                </button>
              </li>
            )
          })}
          {petitions.length > list.length ? (
            <li>
              <button type="button" className="petition-strip-more" onClick={onOpen}>
                +{petitions.length - list.length} {t.petitions.seeAll}
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
