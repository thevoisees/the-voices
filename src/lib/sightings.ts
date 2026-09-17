import type { MissingSighting, NewSightingInput } from '../types-community'
import { FLAG_THRESHOLD, getDeviceId } from './device'
import { stripIdentity } from './strip'
import { supabase, supabaseConfigured } from './supabase'

const LOCAL_KEY = 'thevoices_sightings'
const CONFIRMS_KEY = 'thevoices_sighting_confirms'
const FLAGS_KEY = 'thevoices_sighting_flags'

function loadAllLocal(): MissingSighting[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MissingSighting[]
  } catch {
    return []
  }
}

function loadLocal(): MissingSighting[] {
  return loadAllLocal().filter((s) => !s.hidden)
}

function saveLocal(list: MissingSighting[]) {
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

function merge(lists: MissingSighting[][]): MissingSighting[] {
  const map = new Map<string, MissingSighting>()
  for (const list of lists) {
    for (const s of list) {
      if (s.hidden) continue
      const prev = map.get(s.id)
      if (!prev) {
        map.set(s.id, s)
        continue
      }
      map.set(s.id, {
        ...prev,
        ...s,
        confirm_count: Math.max(prev.confirm_count ?? 0, s.confirm_count ?? 0),
        flag_count: Math.max(prev.flag_count ?? 0, s.flag_count ?? 0),
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export async function fetchSightings(personId?: string): Promise<MissingSighting[]> {
  const local = personId
    ? loadLocal().filter((s) => s.person_id === personId)
    : loadLocal()

  if (!supabaseConfigured || !supabase) return local

  let q = supabase
    .from('missing_sightings')
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(500)

  if (personId) q = q.eq('person_id', personId)

  const { data, error } = await q
  if (error || !data) {
    console.warn('missing_sightings fetch failed', error?.message)
    return local
  }

  const live = (data as MissingSighting[]).map((s) => ({
    ...s,
    source: 'live' as const,
  }))
  return merge([live, local])
}

export async function submitSighting(
  input: NewSightingInput,
): Promise<{ ok: boolean; sighting?: MissingSighting; error?: string }> {
  const place_text = stripIdentity(input.place_text.trim()) || ''
  const when_text = stripIdentity(input.when_text.trim()) || ''
  const note = input.note?.trim() ? stripIdentity(input.note.trim()) : null

  if (!input.person_id || !place_text || !when_text) {
    return { ok: false, error: 'need_fields' }
  }

  const sighting: MissingSighting = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    person_id: input.person_id,
    place_text,
    when_text,
    note,
    grid_lat: input.grid_lat ?? null,
    grid_lng: input.grid_lng ?? null,
    confirm_count: 0,
    flag_count: 0,
    hidden: false,
    source: 'local',
  }

  const local = loadAllLocal()
  local.unshift(sighting)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('missing_sightings').insert({
      id: sighting.id,
      created_at: sighting.created_at,
      person_id: sighting.person_id,
      place_text: sighting.place_text,
      when_text: sighting.when_text,
      note: sighting.note,
      grid_lat: sighting.grid_lat,
      grid_lng: sighting.grid_lng,
      confirm_count: 0,
      flag_count: 0,
      hidden: false,
    })
    if (!error) {
      sighting.source = 'live'
      saveLocal(local.map((s) => (s.id === sighting.id ? sighting : s)))
    } else {
      console.warn('missing_sightings insert failed', error.message)
    }
  }

  return { ok: true, sighting }
}

export function hasConfirmedSighting(id: string): boolean {
  return loadSet(CONFIRMS_KEY).has(id)
}

export function hasFlaggedSighting(id: string): boolean {
  return loadSet(FLAGS_KEY).has(id)
}

export async function confirmSighting(
  id: string,
): Promise<{ ok: boolean; sighting?: MissingSighting; error?: string }> {
  if (hasConfirmedSighting(id)) return { ok: false, error: 'already' }

  const all = loadAllLocal()
  let target = all.find((s) => s.id === id)
  if (!target) {
    const fetched = await fetchSightings()
    target = fetched.find((s) => s.id === id)
  }
  if (!target || target.hidden) return { ok: false, error: 'missing' }

  const confirms = loadSet(CONFIRMS_KEY)
  confirms.add(id)
  saveSet(CONFIRMS_KEY, confirms)

  const confirm_count = (target.confirm_count ?? 0) + 1
  const next = { ...target, confirm_count }

  const local = loadAllLocal()
  const idx = local.findIndex((s) => s.id === id)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('missing_sighting_confirms').upsert({
      sighting_id: id,
      device_id: getDeviceId(),
    })
    await supabase
      .from('missing_sightings')
      .update({ confirm_count })
      .eq('id', id)
  }

  return { ok: true, sighting: next }
}

export async function flagSighting(
  id: string,
): Promise<{ ok: boolean; hidden?: boolean; error?: string }> {
  if (hasFlaggedSighting(id)) return { ok: false, error: 'already' }

  const all = await fetchSightings()
  const target = all.find((s) => s.id === id)
  if (!target) return { ok: false, error: 'missing' }

  const flagged = loadSet(FLAGS_KEY)
  flagged.add(id)
  saveSet(FLAGS_KEY, flagged)

  const flag_count = (target.flag_count ?? 0) + 1
  const hidden = flag_count >= FLAG_THRESHOLD
  const next = { ...target, flag_count, hidden }

  const local = loadAllLocal()
  const idx = local.findIndex((s) => s.id === id)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('missing_sighting_flags').upsert({
      sighting_id: id,
      device_id: getDeviceId(),
    })
    await supabase
      .from('missing_sightings')
      .update({ flag_count, hidden })
      .eq('id', id)
  }

  return { ok: true, hidden }
}

export function latestSighting(list: MissingSighting[]): MissingSighting | null {
  if (!list.length) return null
  return [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0]
}
