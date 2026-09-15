import type { Lang, Screen } from '../types'
import { useI18n } from '../i18n'

type Props = {
  screen: Screen
  onNavigate: (s: Screen) => void
}

const NAV_ITEMS: { id: Screen; icon: string }[] = [
  { id: 'map', icon: '◎' },
  { id: 'petitions', icon: '▣' },
  { id: 'stats', icon: '▦' },
  { id: 'report', icon: '✎' },
  { id: 'notebook', icon: '☰' },
  { id: 'about', icon: 'ⓘ' },
]

export function TopBar({ screen, onNavigate }: Props) {
  const { t, lang, setLang } = useI18n()

  return (
    <header className="topbar">
      <div className="brand">
        <strong className="brand-name">{t.appName}</strong>
        <span className="tagline">{t.tagline}</span>
      </div>

      <nav className="nav-tabs nav-tabs-desktop" aria-label="Main">
        {NAV_ITEMS.map(({ id }) => (
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

  return (
    <nav className="nav-bottom" aria-label="Mobile">
      {NAV_ITEMS.map(({ id, icon }) => (
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
