import type { Petition } from '../types'
import { gridKey, parseGridKey, snapToGrid } from './grid'
import { supabase, supabaseConfigured } from './supabase'

const LOCAL_KEY = 'healsa_local_petitions'

function loadLocal(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

function saveLocal(map: Record<string, number>) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(map))
}

export async function fetchPetitions(): Promise<Petition[]> {
  const local = loadLocal()

  if (!supabaseConfigured || !supabase) {
    return Object.entries(local).map(([key, count]) => {
      const g = parseGridKey(key)!
      return { grid_key: key, count, grid_lat: g.lat, grid_lng: g.lng }
    })
  }

  const { data, error } = await supabase.from('petitions').select('*')
  if (error) {
    console.warn('Petitions fetch failed', error.message)
    return Object.entries(local).map(([key, count]) => {
      const g = parseGridKey(key)!
      return { grid_key: key, count, grid_lat: g.lat, grid_lng: g.lng }
    })
  }

  const fromDb = (data as { grid_key: string; count: number; grid_lat: number; grid_lng: number }[]).map(
    (p) => ({
      grid_key: p.grid_key,
      count: p.count,
      grid_lat: p.grid_lat,
      grid_lng: p.grid_lng,
    }),
  )

  // Merge local increments not yet synced
  for (const [key, count] of Object.entries(local)) {
    const existing = fromDb.find((p) => p.grid_key === key)
    if (existing) existing.count = Math.max(existing.count, count)
    else {
      const g = parseGridKey(key)
      if (g) fromDb.push({ grid_key: key, count, grid_lat: g.lat, grid_lng: g.lng })
    }
  }

  return fromDb
}

export async function signPetition(lat: number, lng: number): Promise<{ ok: boolean; count: number }> {
  const g = snapToGrid(lat, lng)
  const key = gridKey(g.lat, g.lng)
  const local = loadLocal()
  local[key] = (local[key] ?? 0) + 1
  saveLocal(local)

  if (!supabaseConfigured || !supabase) {
    return { ok: true, count: local[key] }
  }

  // Upsert: try increment via RPC-like pattern — read then write
  const { data: existing } = await supabase
    .from('petitions')
    .select('*')
    .eq('grid_key', key)
    .maybeSingle()

  if (existing) {
    const next = (existing.count as number) + 1
    const { error } = await supabase.from('petitions').update({ count: next }).eq('grid_key', key)
    if (error) return { ok: true, count: local[key] }
    return { ok: true, count: next }
  }

  const { error } = await supabase.from('petitions').insert({
    grid_key: key,
    count: 1,
    grid_lat: Number(g.lat.toFixed(4)),
    grid_lng: Number(g.lng.toFixed(4)),
  })

  if (error) return { ok: true, count: local[key] }
  return { ok: true, count: 1 }
}
