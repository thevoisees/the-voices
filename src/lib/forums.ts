import type {
  NeighborhoodForum,
  NewForumInput,
} from '../types-community'
import { FLAG_THRESHOLD, getDeviceId } from './device'
import { stripIdentity } from './strip'
import { supabase, supabaseConfigured } from './supabase'

const LOCAL_KEY = 'thevoices_forums'
const FLAGS_KEY = 'thevoices_forum_flags'

function loadAllLocal(): NeighborhoodForum[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as NeighborhoodForum[]
  } catch {
    return []
  }
}

function loadLocal(): NeighborhoodForum[] {
  return loadAllLocal().filter((f) => !f.hidden)
}

function saveLocal(list: NeighborhoodForum[]) {
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

/** Forums intentionally publish convenor name/contact — do not strip phones. */
function cleanPublic(text: string, max = 200): string {
  return text.trim().replace(/\s{2,}/g, ' ').slice(0, max)
}

function merge(lists: NeighborhoodForum[][]): NeighborhoodForum[] {
  const map = new Map<string, NeighborhoodForum>()
  for (const list of lists) {
    for (const f of list) {
      if (f.hidden) continue
      const prev = map.get(f.id)
      if (!prev) {
        map.set(f.id, f)
        continue
      }
      map.set(f.id, {
        ...prev,
        ...f,
        flag_count: Math.max(prev.flag_count ?? 0, f.flag_count ?? 0),
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export async function fetchForums(): Promise<NeighborhoodForum[]> {
  const local = loadLocal()
  if (!supabaseConfigured || !supabase) return local

  const { data, error } = await supabase
    .from('neighborhood_forums')
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(300)

  if (error || !data) {
    console.warn('neighborhood_forums fetch failed', error?.message)
    return local
  }

  const live = (data as NeighborhoodForum[]).map((f) => ({
    ...f,
    source: 'live' as const,
  }))
  return merge([live, local])
}

export async function createForum(
  input: NewForumInput,
): Promise<{ ok: boolean; forum?: NeighborhoodForum; error?: string }> {
  const name = cleanPublic(input.name, 80)
  const area_text = stripIdentity(input.area_text.trim()) || cleanPublic(input.area_text, 120)
  const convenor_name = cleanPublic(input.convenor_name, 80)
  const convenor_contact = cleanPublic(input.convenor_contact, 120)
  const associates_text = input.associates_text?.trim()
    ? cleanPublic(input.associates_text, 400)
    : null
  const about = input.about?.trim() ? stripIdentity(input.about.trim()) : null
  const what_we_do = input.what_we_do?.trim()
    ? stripIdentity(input.what_we_do.trim())
    : null

  if (!name || !area_text || !convenor_name || !convenor_contact) {
    return { ok: false, error: 'need_fields' }
  }

  const forum: NeighborhoodForum = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    name,
    area_text,
    grid_lat: input.grid_lat ?? null,
    grid_lng: input.grid_lng ?? null,
    convenor_name,
    convenor_contact,
    associates_text,
    about,
    what_we_do,
    flag_count: 0,
    hidden: false,
    source: 'local',
  }

  const local = loadAllLocal()
  local.unshift(forum)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('neighborhood_forums').insert({
      id: forum.id,
      created_at: forum.created_at,
      name: forum.name,
      area_text: forum.area_text,
      grid_lat: forum.grid_lat,
      grid_lng: forum.grid_lng,
      convenor_name: forum.convenor_name,
      convenor_contact: forum.convenor_contact,
      associates_text: forum.associates_text,
      about: forum.about,
      what_we_do: forum.what_we_do,
      flag_count: 0,
      hidden: false,
    })
    if (!error) {
      forum.source = 'live'
      saveLocal(local.map((f) => (f.id === forum.id ? forum : f)))
    } else {
      console.warn('neighborhood_forums insert failed', error.message)
    }
  }

  return { ok: true, forum }
}

export function hasFlaggedForum(id: string): boolean {
  return loadSet(FLAGS_KEY).has(id)
}

export async function flagForum(
  id: string,
): Promise<{ ok: boolean; hidden?: boolean; error?: string }> {
  if (hasFlaggedForum(id)) return { ok: false, error: 'already' }

  const all = await fetchForums()
  const target = all.find((f) => f.id === id)
  if (!target) return { ok: false, error: 'missing' }

  const flagged = loadSet(FLAGS_KEY)
  flagged.add(id)
  saveSet(FLAGS_KEY, flagged)

  const flag_count = (target.flag_count ?? 0) + 1
  const hidden = flag_count >= FLAG_THRESHOLD
  const next = { ...target, flag_count, hidden }

  const local = loadAllLocal()
  const idx = local.findIndex((f) => f.id === id)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('forum_flags').upsert({
      forum_id: id,
      device_id: getDeviceId(),
    })
    await supabase
      .from('neighborhood_forums')
      .update({ flag_count, hidden })
      .eq('id', id)
  }

  return { ok: true, hidden }
}
