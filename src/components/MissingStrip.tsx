import { resolvePhotoUrl } from '../lib/missing'
import type { MissingPerson } from '../types-missing'
import { useI18n } from '../i18n'

type Props = {
  people: MissingPerson[]
  onOpen: () => void
}

export function MissingStrip({ people, onOpen }: Props) {
  const { t } = useI18n()
  const active = people.filter((p) => p.status === 'missing')

  return (
    <div className="missing-strip">
      <div className="missing-strip-head">
        <strong>{t.missing.stripTitle}</strong>
        <button type="button" className="linkish" onClick={onOpen}>
          {t.missing.seeAll}
        </button>
      </div>
      {active.length === 0 ? (
        <button type="button" className="missing-strip-empty" onClick={onOpen}>
          {t.missing.stripEmpty}
        </button>
      ) : (
        <div className="missing-strip-row" role="list">
          {active.slice(0, 12).map((p) => (
            <button
              key={p.id}
              type="button"
              className="missing-face"
              role="listitem"
              onClick={onOpen}
              title={p.name}
            >
              <img src={resolvePhotoUrl(p.photo)} alt={p.name} loading="lazy" />
            </button>
          ))}
          {active.length > 12 ? (
            <button type="button" className="missing-face more" onClick={onOpen}>
              +{active.length - 12}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
