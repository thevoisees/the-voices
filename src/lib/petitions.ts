import { jsPDF } from 'jspdf'
import type { AreaPetition, PetitionScope } from '../types'
import { DEFAULT_PETITION_GOAL, FLAG_THRESHOLD, getDeviceId } from './device'
import { gridKey, snapToGrid } from './grid'
import { stripIdentity } from './strip'
import { supabase, supabaseConfigured } from './supabase'

const LOCAL_KEY = 'thevoices_area_petitions'
const SIGNS_KEY = 'thevoices_petition_signs'
const FLAGS_KEY = 'thevoices_petition_flags'

/** Sentinel for national (not map-zone) petitions */
export const NATIONAL_GRID_KEY = 'national'
export const NATIONAL_LAT = -28.48
export const NATIONAL_LNG = 24.67

function loadLocal(): AreaPetition[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as AreaPetition[])
      .map(normalizePetition)
      .filter((p) => !p.hidden)
  } catch {
    return []
  }
}

function loadAllLocal(): AreaPetition[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as AreaPetition[]).map(normalizePetition)
  } catch {
    return []
  }
}

function saveLocal(list: AreaPetition[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]))
}

export function normalizePetition(p: AreaPetition): AreaPetition {
  const scope: PetitionScope =
    p.scope ?? (p.grid_key === NATIONAL_GRID_KEY ? 'national' : 'area')
  return {
    ...p,
    scope,
    place_label: p.place_label ?? null,
    flag_count: p.flag_count ?? 0,
  }
}

export function isNationalPetition(p: AreaPetition): boolean {
  return normalizePetition(p).scope === 'national'
}

function mergePetitions(lists: AreaPetition[][]): AreaPetition[] {
  const map = new Map<string, AreaPetition>()
  for (const list of lists) {
    for (const raw of list) {
      const p = normalizePetition(raw)
      if (p.hidden) continue
      const prev = map.get(p.id)
      if (!prev) {
        map.set(p.id, p)
        continue
      }
      map.set(p.id, {
        ...prev,
        ...p,
        count: Math.max(prev.count, p.count),
        flag_count: Math.max(prev.flag_count ?? 0, p.flag_count ?? 0),
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export async function fetchPetitions(): Promise<AreaPetition[]> {
  const local = loadLocal()
  if (!supabaseConfigured || !supabase) return local

  const { data, error } = await supabase
    .from('area_petitions')
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error || !data) {
    console.warn('area_petitions fetch failed', error?.message)
    return local
  }

  const live = (data as AreaPetition[]).map((p) =>
    normalizePetition({ ...p, source: 'live' }),
  )
  return mergePetitions([live, local])
}

export async function fetchPetitionById(id: string): Promise<AreaPetition | null> {
  const all = await fetchPetitions()
  return all.find((p) => p.id === id) ?? null
}

export type NewPetitionInput = {
  title: string
  ask: string
  scope: PetitionScope
  lat?: number | null
  lng?: number | null
  goal?: number
  place_label?: string | null
}

export async function createPetition(
  input: NewPetitionInput,
): Promise<{ ok: boolean; petition?: AreaPetition; error?: string }> {
  const title = stripIdentity(input.title.trim()) || ''
  const ask = stripIdentity(input.ask.trim()) || ''
  if (!title || !ask) return { ok: false, error: 'need_fields' }

  const scope: PetitionScope = input.scope === 'national' ? 'national' : 'area'
  if (scope === 'area' && (input.lat == null || input.lng == null)) {
    return { ok: false, error: 'need_place' }
  }

  const goal = Math.max(1, Math.min(500, input.goal ?? DEFAULT_PETITION_GOAL))
  const place_label = input.place_label?.trim()
    ? stripIdentity(input.place_label.trim())
    : null

  let grid_key = NATIONAL_GRID_KEY
  let grid_lat = NATIONAL_LAT
  let grid_lng = NATIONAL_LNG
  if (scope === 'area' && input.lat != null && input.lng != null) {
    const g = snapToGrid(input.lat, input.lng)
    grid_key = gridKey(g.lat, g.lng)
    grid_lat = Number(g.lat.toFixed(4))
    grid_lng = Number(g.lng.toFixed(4))
  }

  const petition: AreaPetition = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    title,
    ask,
    scope,
    grid_key,
    grid_lat,
    grid_lng,
    place_label,
    goal,
    count: 1,
    flag_count: 0,
    hidden: false,
    source: 'local',
  }

  const signs = loadSet(SIGNS_KEY)
  signs.add(petition.id)
  saveSet(SIGNS_KEY, signs)

  const local = loadAllLocal()
  local.unshift(petition)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    const row: Record<string, unknown> = {
      id: petition.id,
      created_at: petition.created_at,
      title: petition.title,
      ask: petition.ask,
      grid_key: petition.grid_key,
      grid_lat: petition.grid_lat,
      grid_lng: petition.grid_lng,
      goal: petition.goal,
      count: 1,
      flag_count: 0,
      hidden: false,
      scope: petition.scope,
      place_label: petition.place_label,
    }
    const { error } = await supabase.from('area_petitions').insert(row)
    if (!error) {
      await supabase.from('area_petition_signs').upsert({
        petition_id: petition.id,
        device_id: getDeviceId(),
      })
      petition.source = 'live'
      saveLocal(local.map((p) => (p.id === petition.id ? petition : p)))
    } else {
      // Older DBs without scope column — retry without new fields
      const { error: err2 } = await supabase.from('area_petitions').insert({
        id: petition.id,
        created_at: petition.created_at,
        title: petition.title,
        ask: petition.ask,
        grid_key: petition.grid_key,
        grid_lat: petition.grid_lat,
        grid_lng: petition.grid_lng,
        goal: petition.goal,
        count: 1,
        flag_count: 0,
        hidden: false,
      })
      if (!err2) {
        await supabase.from('area_petition_signs').upsert({
          petition_id: petition.id,
          device_id: getDeviceId(),
        })
        petition.source = 'live'
      } else {
        console.warn('area_petitions insert failed', error.message, err2.message)
      }
    }
  }

  return { ok: true, petition }
}

export function hasSignedPetition(id: string): boolean {
  return loadSet(SIGNS_KEY).has(id)
}

export async function signPetition(
  id: string,
): Promise<{ ok: boolean; petition?: AreaPetition; error?: string }> {
  const signs = loadSet(SIGNS_KEY)
  if (signs.has(id)) return { ok: false, error: 'already' }

  const all = await fetchPetitions()
  const target = all.find((p) => p.id === id)
  if (!target) return { ok: false, error: 'missing' }

  signs.add(id)
  saveSet(SIGNS_KEY, signs)

  const next = normalizePetition({ ...target, count: target.count + 1 })
  const local = loadAllLocal()
  const idx = local.findIndex((p) => p.id === id)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('area_petition_signs').upsert({
      petition_id: id,
      device_id: getDeviceId(),
    })
    await supabase.from('area_petitions').update({ count: next.count }).eq('id', id)
  }

  return { ok: true, petition: next }
}

export async function flagPetition(
  id: string,
): Promise<{ ok: boolean; hidden?: boolean; error?: string }> {
  const flagged = loadSet(FLAGS_KEY)
  if (flagged.has(id)) return { ok: false, error: 'already' }

  const all = await fetchPetitions()
  const target = all.find((p) => p.id === id)
  if (!target) return { ok: false, error: 'missing' }

  flagged.add(id)
  saveSet(FLAGS_KEY, flagged)

  const flag_count = (target.flag_count ?? 0) + 1
  const hidden = flag_count >= FLAG_THRESHOLD
  const next = { ...target, flag_count, hidden }

  const local = loadAllLocal()
  const idx = local.findIndex((p) => p.id === id)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('area_petition_flags').upsert({
      petition_id: id,
      device_id: getDeviceId(),
    })
    await supabase.from('area_petitions').update({ flag_count, hidden }).eq('id', id)
  }

  return { ok: true, hidden }
}

export function petitionGoalReached(p: AreaPetition): boolean {
  return p.count >= p.goal
}

export function petitionShareUrl(id: string): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}?petition=${encodeURIComponent(id)}`
}

export function buildWhatsAppShareText(p: AreaPetition, siteName: string): string {
  const link = petitionShareUrl(p.id)
  const progress = `${p.count}/${p.goal}`
  const where = isNationalPetition(p)
    ? 'South Africa (national)'
    : p.place_label || `Zone near ${p.grid_lat}, ${p.grid_lng}`
  return [
    `*${siteName}*`,
    '',
    isNationalPetition(p) ? `🇿🇦 ${p.title}` : `📍 ${p.title}`,
    p.ask,
    '',
    `Where: ${where}`,
    `✍️ Signatures: ${progress}`,
    p.count >= p.goal ? '✅ Goal reached — download the pack on the site.' : 'Please sign and share.',
    '',
    link,
  ].join('\n')
}

export function openWhatsAppShare(p: AreaPetition, siteName: string) {
  const text = buildWhatsAppShareText(p, siteName)
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
}

export function downloadPetitionPack(p: AreaPetition, siteName: string) {
  if (!petitionGoalReached(p)) return

  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(siteName, 14, 20)
  doc.setFontSize(12)
  doc.text(
    isNationalPetition(p) ? 'National petition pack' : 'Area petition pack',
    14,
    28,
  )
  doc.setFontSize(11)
  const title = doc.splitTextToSize(p.title, 180)
  doc.text(title, 14, 40)
  let y = 40 + title.length * 6
  const ask = doc.splitTextToSize(p.ask, 180)
  doc.text(ask, 14, y)
  y += ask.length * 6 + 8
  doc.text(`Signatures: ${p.count} (goal was ${p.goal})`, 14, y)
  y += 8
  if (isNationalPetition(p)) {
    doc.text('Scope: National (South Africa)', 14, y)
  } else {
    const place = p.place_label || `Grid ${p.grid_lat}, ${p.grid_lng}`
    doc.text(`Area: ${place}`, 14, y)
    y += 8
    doc.text(`Grid: ${p.grid_lat}, ${p.grid_lng}`, 14, y)
  }
  y += 8
  doc.text(`Created: ${p.created_at.slice(0, 10)}`, 14, y)
  y += 12
  doc.setFontSize(9)
  const note = doc.splitTextToSize(
    'Anonymous community ask for patrols, lights, or safety help — not for arrests by name. Share with CPF, ward councillor, or someone who can act.',
    180,
  )
  doc.text(note, 14, y)
  doc.save(`the-voices-petition-${p.id.slice(0, 8)}.pdf`)
}

/** Area petitions for a map cell (excludes national). */
export function petitionsForCell(list: AreaPetition[], key: string): AreaPetition[] {
  return list.filter((p) => !isNationalPetition(p) && p.grid_key === key)
}

export function areaPetitions(list: AreaPetition[]): AreaPetition[] {
  return list.filter((p) => !isNationalPetition(p))
}

export function nationalPetitions(list: AreaPetition[]): AreaPetition[] {
  return list.filter((p) => isNationalPetition(p))
}
