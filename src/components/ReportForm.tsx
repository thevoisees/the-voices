import { useMemo, useState, type FormEvent } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet'
import { CATEGORIES } from '../data/categories'
import { RED_FLAG_EXAMPLES } from '../data/redFlags'
import { useI18n } from '../i18n'
import { snapToGrid } from '../lib/grid'
import { addNotebookEntry } from '../lib/notebook'
import { submitReport } from '../lib/reports'
import type { AffectedGender, CategoryId, ReporterRole, TimeBand } from '../types'
import 'leaflet/dist/leaflet.css'

type Props = {
  onSubmitted: () => void
}

function LocationPicker({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      const g = snapToGrid(e.latlng.lat, e.latlng.lng)
      onPick(g.lat, g.lng)
    },
  })
  return null
}

export function ReportForm({ onSubmitted }: Props) {
  const { t } = useI18n()
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [category, setCategory] = useState<CategoryId | ''>('')
  const [role, setRole] = useState<ReporterRole>('self')
  const [gender, setGender] = useState<AffectedGender | ''>('')
  const [timeBand, setTimeBand] = useState<TimeBand | ''>('')
  const [incidentDate, setIncidentDate] = useState('')
  const [what, setWhat] = useState('')
  const [redFlag, setRedFlag] = useState('')
  const [customFlag, setCustomFlag] = useState('')
  const [vColor, setVColor] = useState('')
  const [vType, setVType] = useState('')
  const [vDir, setVDir] = useState('')
  const [involvesMinor, setInvolvesMinor] = useState(false)
  const [saveNotebook, setSaveNotebook] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [extraFlags, setExtraFlags] = useState<string[]>([])

  const flagOptions = useMemo(
    () => [...RED_FLAG_EXAMPLES, ...extraFlags],
    [extraFlags],
  )

  const showStory =
    category &&
    category !== 'unsafe_around_someone' &&
    category !== 'possible_remains' &&
    category !== 'body_dump' &&
    !involvesMinor

  function pick(lat0: number, lng0: number) {
    const g = snapToGrid(lat0, lng0)
    setLat(g.lat)
    setLng(g.lng)
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => pick(pos.coords.latitude, pos.coords.longitude),
      () => setStatus('Could not read location'),
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (lat == null || lng == null) {
      setStatus(t.report.needPlace)
      return
    }
    if (!category) {
      setStatus(t.report.needCategory)
      return
    }

    const flagValue =
      category === 'red_flag'
        ? redFlag === '__other__'
          ? customFlag
          : redFlag
        : redFlag || null

    if (category === 'unsafe_around_someone' || saveNotebook) {
      if (what.trim() || flagValue) {
        addNotebookEntry({
          incident_date: incidentDate || new Date().toISOString().slice(0, 10),
          what_happened: what.trim() || flagValue || '',
          was_scared: true,
          phone_taken: /phone/i.test(what),
          area_note: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        })
      }
    }

    setBusy(true)
    const res = await submitReport({
      lat,
      lng,
      category,
      reporter_role: role,
      affected_gender: gender || null,
      time_band: timeBand || null,
      incident_date: incidentDate || null,
      what_happened: showStory ? what : null,
      red_flag: category === 'red_flag' || showStory ? flagValue : null,
      vehicle_color: vColor || null,
      vehicle_type: vType || null,
      vehicle_direction: vDir || null,
      involves_minor: involvesMinor,
    })
    setBusy(false)
    setStatus(res.error ? `${t.report.success} (${res.error})` : t.report.success)
    onSubmitted()
    setWhat('')
    setRedFlag('')
    setCustomFlag('')
  }

  return (
    <div className="page-scroll">
      <form className="form panel" onSubmit={onSubmit}>
        <h1>{t.report.title}</h1>
        <p className="banner warn">{t.report.notDocket}</p>
        <p className="hint">{t.report.noNames}</p>

        <fieldset>
          <legend>{t.report.pickPlace}</legend>
          <button type="button" className="secondary" onClick={useMyLocation}>
            {t.report.useLocation}
          </button>
          <div className="mini-map">
            <MapContainer center={[-26.1, 28.22]} zoom={11} className="leaflet-mini">
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker onPick={pick} />
              {lat != null && lng != null ? (
                <CircleMarker
                  center={[lat, lng]}
                  radius={10}
                  pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.9 }}
                />
              ) : null}
            </MapContainer>
          </div>
          {lat != null && lng != null ? (
            <p className="hint">
              Grid: {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          ) : null}
        </fieldset>

        <label>
          {t.report.category}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId | '')}
            required
          >
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {t.categories[c.labelKey as keyof typeof t.categories]}
              </option>
            ))}
          </select>
        </label>

        {category === 'possible_remains' ? (
          <p className="banner danger">{t.report.remainsNote}</p>
        ) : null}
        {category === 'unsafe_around_someone' ? (
          <p className="banner info">{t.report.unsafeNote}</p>
        ) : null}

        <label>
          {t.report.role}
          <select value={role} onChange={(e) => setRole(e.target.value as ReporterRole)}>
            <option value="self">{t.report.roleSelf}</option>
            <option value="bystander">{t.report.roleBystander}</option>
            <option value="other">{t.report.roleOther}</option>
          </select>
        </label>

        <label>
          {t.report.gender}
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as AffectedGender | '')}
          >
            <option value="">{t.report.genderSkip}</option>
            <option value="woman">{t.report.genderWoman}</option>
            <option value="man">{t.report.genderMan}</option>
            <option value="girl">{t.report.genderGirl}</option>
            <option value="boy">{t.report.genderBoy}</option>
            <option value="unknown">{t.report.genderUnknown}</option>
          </select>
        </label>
        <p className="hint">{t.report.genderHint}</p>

        <label>
          {t.report.timeBand}
          <select
            value={timeBand}
            onChange={(e) => setTimeBand(e.target.value as TimeBand | '')}
          >
            <option value="">—</option>
            <option value="morning">{t.report.morning}</option>
            <option value="afternoon">{t.report.afternoon}</option>
            <option value="evening">{t.report.evening}</option>
            <option value="night">{t.report.night}</option>
          </select>
        </label>

        <label>
          {t.report.incidentDate}
          <input
            type="date"
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
          />
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={involvesMinor}
            onChange={(e) => setInvolvesMinor(e.target.checked)}
          />
          {t.report.involvesMinor}
        </label>
        {involvesMinor ? <p className="banner danger">{t.report.minorNote}</p> : null}

        {(showStory || category === 'unsafe_around_someone') && (
          <label>
            {t.report.whatHappened}
            <textarea
              rows={3}
              maxLength={280}
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder={t.report.noNames}
            />
          </label>
        )}

        {(category === 'red_flag' || showStory) && (
          <>
            <label>
              {t.report.redFlag}
              <select value={redFlag} onChange={(e) => setRedFlag(e.target.value)}>
                <option value="">—</option>
                {flagOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
                <option value="__other__">{t.report.redFlagOther}</option>
              </select>
            </label>
            {redFlag === '__other__' ? (
              <label>
                {t.report.redFlagOther}
                <input
                  value={customFlag}
                  maxLength={120}
                  onChange={(e) => setCustomFlag(e.target.value)}
                  onBlur={() => {
                    if (customFlag.trim() && !extraFlags.includes(customFlag.trim())) {
                      setExtraFlags((x) => [...x, customFlag.trim()])
                    }
                  }}
                />
              </label>
            ) : null}
          </>
        )}

        {showStory ? (
          <fieldset>
            <legend>{t.report.vehicle}</legend>
            <label>
              {t.report.vehicleColor}
              <input value={vColor} onChange={(e) => setVColor(e.target.value)} maxLength={40} />
            </label>
            <label>
              {t.report.vehicleType}
              <input value={vType} onChange={(e) => setVType(e.target.value)} maxLength={40} />
            </label>
            <label>
              {t.report.vehicleDirection}
              <input value={vDir} onChange={(e) => setVDir(e.target.value)} maxLength={40} />
            </label>
          </fieldset>
        ) : null}

        {category === 'unsafe_around_someone' || showStory ? (
          <label className="check">
            <input
              type="checkbox"
              checked={saveNotebook || category === 'unsafe_around_someone'}
              onChange={(e) => setSaveNotebook(e.target.checked)}
              disabled={category === 'unsafe_around_someone'}
            />
            {t.report.saveNotebook}
          </label>
        ) : null}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? t.report.submitting : t.report.submit}
        </button>
        {status ? <p className="banner success">{status}</p> : null}
      </form>
    </div>
  )
}
