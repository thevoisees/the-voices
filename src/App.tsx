import { useCallback, useEffect, useMemo, useState } from 'react'
import { About } from './components/About'
import { EmergencyStrip } from './components/EmergencyStrip'
import { IntroGate } from './components/IntroGate'
import { MapView } from './components/MapView'
import { BottomNav, TopBar } from './components/Nav'
import { Notebook } from './components/Notebook'
import { ReportForm } from './components/ReportForm'
import { getDict, I18nContext } from './i18n'
import { fetchPetitions } from './lib/petitions'
import { fetchReports } from './lib/reports'
import type { Lang, Petition, Report, Screen } from './types'

const LANG_KEY = 'thevoices_lang'
const ENTERED_KEY = 'thevoices_entered'

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null
    return saved === 'zu' || saved === 'st' || saved === 'en' ? saved : 'en'
  })
  const [entered, setEntered] = useState(() => sessionStorage.getItem(ENTERED_KEY) === '1')
  const [screen, setScreen] = useState<Screen>('map')
  const [reports, setReports] = useState<Report[]>([])
  const [petitions, setPetitions] = useState<Petition[]>([])
  const [loading, setLoading] = useState(true)

  const t = useMemo(() => getDict(lang), [lang])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem(LANG_KEY, l)
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    const [r, p] = await Promise.all([fetchReports(), fetchPetitions()])
    setReports(r)
    setPetitions(p)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function handleEnter() {
    sessionStorage.setItem(ENTERED_KEY, '1')
    setEntered(true)
  }

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {!entered ? (
        <IntroGate onEnter={handleEnter} />
      ) : (
        <div className="app-shell app-enter">
          <EmergencyStrip />
          <TopBar screen={screen} onNavigate={setScreen} />
          <main className="main">
            {screen === 'map' &&
              (loading ? (
                <p className="loading-msg">{t.map.loading}</p>
              ) : (
                <MapView
                  reports={reports}
                  petitions={petitions}
                  onPetitionsChange={setPetitions}
                  onGoReport={() => setScreen('report')}
                />
              ))}
            {screen === 'report' && (
              <ReportForm
                onSubmitted={() => {
                  void refresh()
                }}
              />
            )}
            {screen === 'notebook' && <Notebook />}
            {screen === 'about' && <About />}
          </main>
          <BottomNav screen={screen} onNavigate={setScreen} />
        </div>
      )}
    </I18nContext.Provider>
  )
}
