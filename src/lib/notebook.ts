import { jsPDF } from 'jspdf'
import type { NotebookEntry } from '../types'

const KEY = 'healsa_private_notebook'

export function loadNotebook(): NotebookEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as NotebookEntry[]
  } catch {
    return []
  }
}

export function saveNotebook(entries: NotebookEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function addNotebookEntry(
  partial: Omit<NotebookEntry, 'id' | 'created_at'>,
): NotebookEntry[] {
  const entries = loadNotebook()
  const entry: NotebookEntry = {
    ...partial,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  const next = [entry, ...entries]
  saveNotebook(next)
  return next
}

export function deleteNotebookEntry(id: string): NotebookEntry[] {
  const next = loadNotebook().filter((e) => e.id !== id)
  saveNotebook(next)
  return next
}

export function exportNotebookPdf(entries: NotebookEntry[]) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('The Voices — Private timeline (this device only)', 14, 18)
  doc.setFontSize(9)
  doc.text(
    'Not sent to The Voices. You control this file. Use it for a protection order or someone you trust.',
    14,
    26,
  )

  let y = 36
  for (const e of entries) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(10)
    doc.text(`Date: ${e.incident_date || e.created_at.slice(0, 10)}`, 14, y)
    y += 6
    doc.text(
      `Scared: ${e.was_scared ? 'Yes' : 'No'}  |  Phone taken: ${e.phone_taken ? 'Yes' : 'No'}`,
      14,
      y,
    )
    y += 6
    if (e.area_note) {
      const area = doc.splitTextToSize(`Area note: ${e.area_note}`, 180)
      doc.text(area, 14, y)
      y += area.length * 5
    }
    const body = doc.splitTextToSize(e.what_happened || '(no detail)', 180)
    doc.text(body, 14, y)
    y += body.length * 5 + 8
  }

  doc.save('the-voices-private-notebook.pdf')
}
