import { useCallback, useEffect, useMemo, useState } from 'react'
import { About } from './components/About'
import { CommunityPage } from './components/CommunityPage'
import { EmergencyStrip } from './components/EmergencyStrip'
import { IntroGate } from './components/IntroGate'
import { MapView } from './components/MapView'
import { BottomNav, TopBar } from './components/Nav'
import { Notebook } from './components/Notebook'
import { PetitionsPage } from './components/PetitionsPage'
import { ReportForm } from './components/ReportForm'
import { Statistics } from './components/Statistics'
import { getDict, I18nContext } from './i18n'
import { fetchAnnouncements } from './lib/announcements'
import { readDeepLink } from './lib/deeplink'
import { fetchForums } from './lib/forums'
import { fetchMissingPeople } from './lib/missing'
import { fetchPetitions } from './lib/petitions'
import { fetchReports } from './lib/reports'
import { fetchSearches } from './lib/searches'
import type { AreaPetition, CommunityAnnouncement, Lang, Report, Screen } from './types'
import type { NeighborhoodForum, SearchCall } from './types-community'
import type { MissingPerson } from './types-missing'

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
  const [petitions, setPetitions] = useState<AreaPetition[]>([])
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([])
  const [missingPeople, setMissingPeople] = useState<MissingPerson[]>([])
  const [forums, setForums] = useState<NeighborhoodForum[]>([])
  const [searches, setSearches] = useState<SearchCall[]>([])
  const [loading, setLoading] = useState(true)
  const [deepLink] = useState(() => readDeepLink())
  const [focusSpotKey, setFocusSpotKey] = useState<string | null>(null)

  const t = useMemo(() => getDict(lang), [lang])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem(LANG_KEY, l)
  }

  const refreshMissing = useCallback(async () => {
    const m = await fetchMissingPeople()
    setMissingPeople(m)
  }, [])

  const refreshPetitions = useCallback(async () => {
    const p = await fetchPetitions()
    setPetitions(p)
  }, [])

  const refreshAnnouncements = useCallback(async () => {
    const a = await fetchAnnouncements()
    setAnnouncements(a)
  }, [])

  const refreshCare = useCallback(async () => {
    const [f, s] = await Promise.all([fetchForums(), fetchSearches()])
    setForums(f)
    setSearches(s)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    const [r, p, m, a, f, s] = await Promise.all([
      fetchReports(),
      fetchPetitions(),
      fetchMissingPeople(),
      fetchAnnouncements(),
      fetchForums(),
      fetchSearches(),
    ])
    setReports(r)
    setPetitions(p)
    setMissingPeople(m)
    setAnnouncements(a)
    setForums(f)
    setSearches(s)
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
                  onPetitionsChange={() => {
                    void refreshPetitions()
                    void refresh()
                  }}
                  missingPeople={missingPeople}
                  onMissingChange={() => void refreshMissing()}
                  forums={forums}
                  searches={searches}
                  onCareChange={() => void refreshCare()}
                  onOpenCommunity={() => setScreen('community')}
                  onGoReport={() => setScreen('report')}
                  initialSpotKey={deepLink.spotKey}
                  initialPetitionId={deepLink.petitionId}
                  focusSpotKey={focusSpotKey}
                  onFocusSpotConsumed={() => setFocusSpotKey(null)}
                />
              ))}
            {screen === 'petitions' && (
              <PetitionsPage
                petitions={petitions}
                announcements={announcements}
                onChange={() => void refreshPetitions()}
                onAnnouncementsChange={() => void refreshAnnouncements()}
                onOpenOnMap={(key) => {
                  setFocusSpotKey(key)
                  setScreen('map')
                }}
              />
            )}
            {screen === 'community' && (
              <CommunityPage
                forums={forums}
                searches={searches}
                missingPeople={missingPeople}
                onForumsChange={() => void refreshCare()}
                onSearchesChange={() => void refreshCare()}
              />
            )}
            {screen === 'report' && (
              <ReportForm
                onSubmitted={() => {
                  void refresh()
                }}
              />
            )}
            {screen === 'stats' && (
              <Statistics
                reports={reports}
                missingPeople={missingPeople}
                onOpenArea={(key) => {
                  setFocusSpotKey(key)
                  setScreen('map')
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
