import type {
  NewSearchInput,
  SearchCall,
  SearchSquad,
  SearchStatus,
} from '../types-community'
import { FLAG_THRESHOLD, getDeviceId } from './device'
import { stripIdentity } from './strip'
import { supabase, supabaseConfigured } from './supabase'

const LOCAL_KEY = 'thevoices_searches'
const JOINS_KEY = 'thevoices_search_joins'
const FLAGS_KEY = 'thevoices_search_flags'

function loadAllLocal(): SearchCall[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SearchCall[]
  } catch {
    return []
  }
}

function loadLocal(): SearchCall[] {
  return loadAllLocal().filter((s) => !s.hidden)
}

function saveLocal(list: SearchCall[]) {
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

function cleanContact(text: string, max = 120): string {
  return text.trim().replace(/\s{2,}/g, ' ').slice(0, max)
}

function merge(lists: SearchCall[][]): SearchCall[] {
  const map = new Map<string, SearchCall>()
  for (const list of lists) {
    for (const s of list) {
      if (s.hidden) continue
      const prev = map.get(s.id)
      if (!prev) {
        map.set(s.id, { ...s, squads: s.squads ?? [] })
        continue
      }
      const squadMap = new Map<string, SearchSquad>()
      for (const sq of [...(prev.squads ?? []), ...(s.squads ?? [])]) {
        const p = squadMap.get(sq.id)
        if (!p) squadMap.set(sq.id, sq)
        else
          squadMap.set(sq.id, {
            ...p,
            ...sq,
            join_count: Math.max(p.join_count ?? 0, sq.join_count ?? 0),
          })
      }
      map.set(s.id, {
        ...prev,
        ...s,
        flag_count: Math.max(prev.flag_count ?? 0, s.flag_count ?? 0),
        squads: [...squadMap.values()],
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export async function fetchSearches(): Promise<SearchCall[]> {
  const local = loadLocal()
  if (!supabaseConfigured || !supabase) return local

  const { data, error } = await supabase
    .from('search_calls')
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(300)

  if (error || !data) {
    console.warn('search_calls fetch failed', error?.message)
    return local
  }

  const ids = data.map((r) => r.id as string)
  let squads: SearchSquad[] = []
  if (ids.length) {
    const { data: sqData, error: sqErr } = await supabase
      .from('search_squads')
      .select('*')
      .in('search_id', ids)
    if (sqErr) console.warn('search_squads fetch failed', sqErr.message)
    else squads = (sqData ?? []) as SearchSquad[]
  }

  const bySearch = new Map<string, SearchSquad[]>()
  for (const sq of squads) {
    const list = bySearch.get(sq.search_id) ?? []
    list.push(sq)
    bySearch.set(sq.search_id, list)
  }

  const live: SearchCall[] = (data as Omit<SearchCall, 'squads' | 'source'>[]).map(
    (s) => ({
      ...s,
      source: 'live' as const,
      squads: bySearch.get(s.id) ?? [],
    }),
  )

  return merge([live, local])
}

export async function fetchSearchesForPerson(personId: string): Promise<SearchCall[]> {
  const all = await fetchSearches()
  return all.filter((s) => s.person_id === personId)
}

export async function createSearch(
  input: NewSearchInput,
): Promise<{ ok: boolean; search?: SearchCall; error?: string }> {
  const area_text = stripIdentity(input.area_text.trim()) || ''
  const when_text = stripIdentity(input.when_text.trim()) || ''
  const guidance = input.guidance?.trim()
    ? stripIdentity(input.guidance.trim())
    : null
  const marshal_name = input.marshal_name?.trim()
    ? cleanContact(input.marshal_name, 80)
    : null
  const marshal_contact = input.marshal_contact?.trim()
    ? cleanContact(input.marshal_contact, 120)
    : null

  if (!input.person_id || !area_text || !when_text) {
    return { ok: false, error: 'need_fields' }
  }
  if (!input.squads.length) return { ok: false, error: 'need_squad' }

  const squads: SearchSquad[] = []
  for (const sq of input.squads) {
    const label = stripIdentity(sq.label.trim()) || cleanContact(sq.label, 60)
    const meet_place = stripIdentity(sq.meet_place.trim()) || ''
    const meet_when = stripIdentity(sq.meet_when.trim()) || ''
    if (!label || !meet_place || !meet_when) {
      return { ok: false, error: 'need_squad' }
    }
    squads.push({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      search_id: '', // filled below
      label,
      meet_place,
      meet_when,
      grid_lat: sq.grid_lat ?? null,
      grid_lng: sq.grid_lng ?? null,
      marshal_name: sq.marshal_name?.trim()
        ? cleanContact(sq.marshal_name, 80)
        : null,
      marshal_contact: sq.marshal_contact?.trim()
        ? cleanContact(sq.marshal_contact, 120)
        : null,
      join_count: 0,
    })
  }

  const searchId = crypto.randomUUID()
  for (const sq of squads) sq.search_id = searchId

  const search: SearchCall = {
    id: searchId,
    created_at: new Date().toISOString(),
    person_id: input.person_id,
    area_text,
    grid_lat: input.grid_lat ?? null,
    grid_lng: input.grid_lng ?? null,
    when_text,
    guidance,
    status: 'recruiting',
    marshal_name,
    marshal_contact,
    forum_id: input.forum_id ?? null,
    flag_count: 0,
    hidden: false,
    source: 'local',
    squads,
  }

  const local = loadAllLocal()
  local.unshift(search)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('search_calls').insert({
      id: search.id,
      created_at: search.created_at,
      person_id: search.person_id,
      area_text: search.area_text,
      grid_lat: search.grid_lat,
      grid_lng: search.grid_lng,
      when_text: search.when_text,
      guidance: search.guidance,
      status: search.status,
      marshal_name: search.marshal_name,
      marshal_contact: search.marshal_contact,
      forum_id: search.forum_id,
      flag_count: 0,
      hidden: false,
    })
    if (error) {
      console.warn('search_calls insert failed', error.message)
    } else {
      const { error: sqErr } = await supabase.from('search_squads').insert(
        squads.map((sq) => ({
          id: sq.id,
          created_at: sq.created_at,
          search_id: sq.search_id,
          label: sq.label,
          meet_place: sq.meet_place,
          meet_when: sq.meet_when,
          grid_lat: sq.grid_lat,
          grid_lng: sq.grid_lng,
          marshal_name: sq.marshal_name,
          marshal_contact: sq.marshal_contact,
          join_count: 0,
        })),
      )
      if (sqErr) console.warn('search_squads insert failed', sqErr.message)
      else {
        search.source = 'live'
        saveLocal(local.map((s) => (s.id === search.id ? search : s)))
      }
    }
  }

  return { ok: true, search }
}

export function hasJoinedSquad(squadId: string): boolean {
  return loadSet(JOINS_KEY).has(squadId)
}

export function hasFlaggedSearch(id: string): boolean {
  return loadSet(FLAGS_KEY).has(id)
}

export async function joinSquad(
  searchId: string,
  squadId: string,
): Promise<{ ok: boolean; search?: SearchCall; error?: string }> {
  if (hasJoinedSquad(squadId)) return { ok: false, error: 'already' }

  const local = loadAllLocal()
  let search = local.find((s) => s.id === searchId)
  if (!search) {
    const fetched = await fetchSearches()
    search = fetched.find((s) => s.id === searchId)
  }
  if (!search || search.hidden) return { ok: false, error: 'missing' }
  if (search.status === 'closed') return { ok: false, error: 'closed' }

  const squad = search.squads.find((sq) => sq.id === squadId)
  if (!squad) return { ok: false, error: 'missing' }

  const joins = loadSet(JOINS_KEY)
  joins.add(squadId)
  saveSet(JOINS_KEY, joins)

  const join_count = (squad.join_count ?? 0) + 1
  const nextSquads = search.squads.map((sq) =>
    sq.id === squadId ? { ...sq, join_count } : sq,
  )
  const nextStatus: SearchStatus =
    search.status === 'recruiting' ? 'active' : search.status
  const next: SearchCall = {
    ...search,
    status: nextStatus,
    squads: nextSquads,
  }

  const idx = local.findIndex((s) => s.id === searchId)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('search_joins').upsert({
      squad_id: squadId,
      device_id: getDeviceId(),
    })
    await supabase
      .from('search_squads')
      .update({ join_count })
      .eq('id', squadId)
    if (nextStatus !== search.status) {
      await supabase
        .from('search_calls')
        .update({ status: nextStatus })
        .eq('id', searchId)
    }
  }

  return { ok: true, search: next }
}

export async function closeSearch(
  id: string,
): Promise<{ ok: boolean; search?: SearchCall; error?: string }> {
  const local = loadAllLocal()
  let search = local.find((s) => s.id === id)
  if (!search) {
    const fetched = await fetchSearches()
    search = fetched.find((s) => s.id === id)
  }
  if (!search) return { ok: false, error: 'missing' }

  const next: SearchCall = { ...search, status: 'closed' }
  const idx = local.findIndex((s) => s.id === id)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('search_calls').update({ status: 'closed' }).eq('id', id)
  }

  return { ok: true, search: next }
}

export async function flagSearch(
  id: string,
): Promise<{ ok: boolean; hidden?: boolean; error?: string }> {
  if (hasFlaggedSearch(id)) return { ok: false, error: 'already' }

  const all = await fetchSearches()
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
    await supabase.from('search_flags').upsert({
      search_id: id,
      device_id: getDeviceId(),
    })
    await supabase
      .from('search_calls')
      .update({ flag_count, hidden })
      .eq('id', id)
  }

  return { ok: true, hidden }
}

export function activeSearchCount(searches: SearchCall[]): number {
  return searches.filter(
    (s) => s.status === 'recruiting' || s.status === 'active',
  ).length
}
