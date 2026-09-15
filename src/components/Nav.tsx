import { useEffect, useRef, useState } from 'react'
import type { Lang, Screen } from '../types'
import { useI18n } from '../i18n'

type Props = {
  screen: Screen
  onNavigate: (s: Screen) => void
}

const PRIMARY: { id: Screen; icon: string }[] = [
  { id: 'map', icon: '◎' },
  { id: 'petitions', icon: '▣' },
  { id: 'stats', icon: '▦' },
  { id: 'report', icon: '✎' },
]

const MORE_ITEMS: { id: Screen; icon: string }[] = [
  { id: 'notebook', icon: '☰' },
  { id: 'about', icon: 'ⓘ' },
]

const ALL_ITEMS = [...PRIMARY, ...MORE_ITEMS]

export function TopBar({ screen, onNavigate }: Props) {
  const { t, lang, setLang } = useI18n()

  return (
    <header className="topbar">
      <div className="brand">
        <strong className="brand-name">{t.appName}</strong>
        <span className="tagline">{t.tagline}</span>
      </div>

      <nav className="nav-tabs nav-tabs-desktop" aria-label="Main">
        {ALL_ITEMS.map(({ id }) => (
          <button
            key={id}
            type="button"
            className={screen === id ? 'active' : ''}
            onClick={() => onNavigate(id)}
          >
            {t.nav[id]}
          </button>
        ))}
      </nav>

      <label className="lang-select">
        <span className="sr-only">Language</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          aria-label="Language"
        >
          <option value="en">English</option>
          <option value="zu">isiZulu</option>
          <option value="st">Sesotho</option>
        </select>
      </label>
    </header>
  )
}

export function BottomNav({ screen, onNavigate }: Props) {
  const { t } = useI18n()
  const [moreOpen, setMoreOpen] = useState(false)
  const wrapRef = useRef<HTMLElement>(null)
  const moreActive = MORE_ITEMS.some((i) => i.id === screen)

  useEffect(() => {
    setMoreOpen(false)
  }, [screen])

  useEffect(() => {
    if (!moreOpen) return
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  return (
    <nav className="nav-bottom" aria-label="Mobile" ref={wrapRef}>
      {PRIMARY.map(({ id, icon }) => (
        <button
          key={id}
          type="button"
          className={screen === id ? 'active' : ''}
          onClick={() => onNavigate(id)}
        >
          <span className="nav-icon" aria-hidden>
            {icon}
          </span>
          <span className="nav-label">{t.nav[id]}</span>
        </button>
      ))}

      <div className="nav-more-wrap">
        <button
          type="button"
          className={moreActive || moreOpen ? 'active' : ''}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          onClick={() => setMoreOpen((o) => !o)}
        >
          <span className="nav-icon" aria-hidden>
            ···
          </span>
          <span className="nav-label">{t.nav.more}</span>
        </button>

        {moreOpen ? (
          <div className="nav-more-sheet" role="menu" aria-label={t.nav.more}>
            {MORE_ITEMS.map(({ id, icon }) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                className={screen === id ? 'active' : ''}
                onClick={() => {
                  onNavigate(id)
                  setMoreOpen(false)
                }}
              >
                <span className="nav-icon" aria-hidden>
                  {icon}
                </span>
                <span>{t.nav[id]}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  )
}

/** @deprecated use TopBar + BottomNav */
export function Nav(props: Props) {
  return (
    <>
      <TopBar {...props} />
      <BottomNav {...props} />
    </>
  )
}
