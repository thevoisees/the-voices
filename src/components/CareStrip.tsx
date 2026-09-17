import { activeSearchCount } from '../lib/searches'
import type { NeighborhoodForum, SearchCall } from '../types-community'
import { useI18n } from '../i18n'

type Props = {
  searches: SearchCall[]
  forums: NeighborhoodForum[]
  onOpen: () => void
}

export function CareStrip({ searches, forums, onOpen }: Props) {
  const { t } = useI18n()
  const open = activeSearchCount(searches)
  const forumN = forums.length

  return (
    <div className="care-strip">
      <div className="care-strip-head">
        <strong>{t.community.stripTitle}</strong>
        <button type="button" className="linkish" onClick={onOpen}>
          {t.community.stripOpen}
        </button>
      </div>
      {open === 0 && forumN === 0 ? (
        <button type="button" className="care-strip-empty" onClick={onOpen}>
          {t.community.stripEmpty}
        </button>
      ) : (
        <button type="button" className="care-strip-summary" onClick={onOpen}>
          {open > 0
            ? t.community.stripSearches.replace('{n}', String(open))
            : null}
          {open > 0 && forumN > 0 ? ' · ' : null}
          {forumN > 0
            ? t.community.stripForums.replace('{n}', String(forumN))
            : null}
        </button>
      )}
    </div>
  )
}
