import { jsPDF } from 'jspdf'
import type { AreaPetition } from '../types'
import { DEFAULT_PETITION_GOAL, FLAG_THRESHOLD, getDeviceId } from './device'
import { gridKey, snapToGrid } from './grid'
import { stripIdentity } from './strip'
import { supabase, supabaseConfigured } from './supabase'

const LOCAL_KEY = 'thevoices_area_petitions'
const SIGNS_KEY = 'thevoices_petition_signs'
const FLAGS_KEY = 'thevoices_petition_flags'

function loadLocal(): AreaPetition[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as AreaPetition[]).filter((p) => !p.hidden)
  } catch {
    return []
  }
}

function loadAllLocal(): AreaPetition[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AreaPetition[]
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

function mergePetitions(lists: AreaPetition[][]): AreaPetition[] {
  const map = new Map<string, AreaPetition>()
  for (const list of lists) {
    for (const p of list) {
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

  const live = (data as AreaPetition[]).map((p) => ({ ...p, source: 'live' as const }))
  return mergePetitions([live, local])
}

export async function fetchPetitionById(id: string): Promise<AreaPetition | null> {
  const all = await fetchPetitions()
  return all.find((p) => p.id === id) ?? null
}

export type NewPetitionInput = {
  title: string
  ask: string
  lat: number
  lng: number
  goal?: number
}

export async function createPetition(
  input: NewPetitionInput,
): Promise<{ ok: boolean; petition?: AreaPetition; error?: string }> {
  const title = stripIdentity(input.title.trim()) || ''
  const ask = stripIdentity(input.ask.trim()) || ''
  if (!title || !ask) return { ok: false, error: 'need_fields' }

  const g = snapToGrid(input.lat, input.lng)
  const goal = Math.max(1, Math.min(500, input.goal ?? DEFAULT_PETITION_GOAL))
  const petition: AreaPetition = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    title,
    ask,
    grid_key: gridKey(g.lat, g.lng),
    grid_lat: Number(g.lat.toFixed(4)),
    grid_lng: Number(g.lng.toFixed(4)),
    goal,
    count: 1,
    flag_count: 0,
    hidden: false,
    source: 'local',
  }

  // Creator auto-signs
  const signs = loadSet(SIGNS_KEY)
  signs.add(petition.id)
  saveSet(SIGNS_KEY, signs)

  const local = loadAllLocal()
  local.unshift(petition)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('area_petitions').insert({
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
    if (!error) {
      await supabase.from('area_petition_signs').upsert({
        petition_id: petition.id,
        device_id: getDeviceId(),
      })
      petition.source = 'live'
      saveLocal(local.map((p) => (p.id === petition.id ? petition : p)))
    } else {
      console.warn('area_petitions insert failed', error.message)
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

  const next = { ...target, count: target.count + 1 }
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
  return [
    `*${siteName}*`,
    '',
    `📍 ${p.title}`,
    p.ask,
    '',
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
  doc.text('Area petition pack', 14, 28)
  doc.setFontSize(11)
  const title = doc.splitTextToSize(p.title, 180)
  doc.text(title, 14, 40)
  let y = 40 + title.length * 6
  const ask = doc.splitTextToSize(p.ask, 180)
  doc.text(ask, 14, y)
  y += ask.length * 6 + 8
  doc.text(`Signatures: ${p.count} (goal was ${p.goal})`, 14, y)
  y += 8
  doc.text(`Area grid: ${p.grid_lat}, ${p.grid_lng}`, 14, y)
  y += 8
  doc.text(`Created: ${p.created_at.slice(0, 10)}`, 14, y)
  y += 12
  doc.setFontSize(9)
  const note = doc.splitTextToSize(
    'Anonymous community ask for patrols, lights, or safety help in this area — not for arrests by name. Share with CPF, ward councillor, or someone who can act.',
    180,
  )
  doc.text(note, 14, y)
  doc.save(`the-voices-petition-${p.id.slice(0, 8)}.pdf`)
}

/** Petitions near a grid key (same cell) */
export function petitionsForCell(list: AreaPetition[], key: string): AreaPetition[] {
  return list.filter((p) => p.grid_key === key)
}
