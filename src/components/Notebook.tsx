import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import {
  addNotebookEntry,
  deleteNotebookEntry,
  exportNotebookPdf,
  loadNotebook,
} from '../lib/notebook'
import type { NotebookEntry } from '../types'

export function Notebook() {
  const { t } = useI18n()
  const [entries, setEntries] = useState<NotebookEntry[]>(() => loadNotebook())
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [what, setWhat] = useState('')
  const [scared, setScared] = useState(true)
  const [phone, setPhone] = useState(false)
  const [area, setArea] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  function add(e: FormEvent) {
    e.preventDefault()
    if (!what.trim()) return
    const next = addNotebookEntry({
      incident_date: date,
      what_happened: what.trim(),
      was_scared: scared,
      phone_taken: phone,
      area_note: area.trim(),
    })
    setEntries(next)
    setWhat('')
    setMsg(t.notebook.saved)
  }

  return (
    <div className="page-scroll">
      <div className="panel notebook">
        <h1>{t.notebook.title}</h1>
        <p>{t.notebook.subtitle}</p>

        <form onSubmit={add} className="form tight">
          <label>
            {t.notebook.date}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            {t.notebook.what}
            <textarea rows={4} value={what} onChange={(e) => setWhat(e.target.value)} required />
          </label>
          <label className="check">
            <input type="checkbox" checked={scared} onChange={(e) => setScared(e.target.checked)} />
            {t.notebook.scared}
          </label>
          <label className="check">
            <input type="checkbox" checked={phone} onChange={(e) => setPhone(e.target.checked)} />
            {t.notebook.phone}
          </label>
          <label>
            {t.notebook.area}
            <input value={area} onChange={(e) => setArea(e.target.value)} />
          </label>
          <div className="row-actions">
            <button type="submit" className="primary">
              {t.notebook.add}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => exportNotebookPdf(entries)}
              disabled={!entries.length}
            >
              {t.notebook.export}
            </button>
          </div>
          {msg ? <p className="banner success">{msg}</p> : null}
        </form>

        {entries.length === 0 ? (
          <p className="hint">{t.notebook.empty}</p>
        ) : (
          <ul className="notebook-list">
            {entries.map((en) => (
              <li key={en.id}>
                <div>
                  <strong>{en.incident_date}</strong>
                  <span>
                    {en.was_scared ? ' · scared' : ''}
                    {en.phone_taken ? ' · phone' : ''}
                  </span>
                  {en.area_note ? <div className="hint">{en.area_note}</div> : null}
                  <p>{en.what_happened}</p>
                </div>
                <button
                  type="button"
                  className="linkish"
                  onClick={() => setEntries(deleteNotebookEntry(en.id))}
                >
                  {t.notebook.delete}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
