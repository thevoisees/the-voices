import { compressImageToDataUrl } from './image'
import { supabase, supabaseConfigured } from './supabase'
import type {
  FoundOutcome,
  MissingPerson,
  NewMissingInput,
} from '../types-missing'
import { MISSING_VERIFY_THRESHOLD } from '../types-missing'

const LOCAL_KEY = 'thevoices_missing_people'
const VOTES_KEY = 'thevoices_missing_votes'
const DEVICE_KEY = 'thevoices_device_id'
const CATALOG_URL = './missing/people.json'

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

function loadLocal(): MissingPerson[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MissingPerson[]
  } catch {
    return []
  }
}

function saveLocal(list: MissingPerson[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

type VoteMap = Record<string, FoundOutcome>
function loadVotes(): VoteMap {
  try {
    const raw = localStorage.getItem(VOTES_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as VoteMap
  } catch {
    return {}
  }
}

function saveVotes(v: VoteMap) {
  localStorage.setItem(VOTES_KEY, JSON.stringify(v))
}

async function fetchGithubCatalog(): Promise<MissingPerson[]> {
  try {
    const res = await fetch(`${CATALOG_URL}?t=${Date.now()}`)
    if (!res.ok) return []
    const data = (await res.json()) as MissingPerson[]
    return data.map((p) => ({ ...p, source: 'github' as const }))
  } catch {
    return []
  }
}

async function fetchLive(): Promise<MissingPerson[]> {
  if (!supabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('missing_people')
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error || !data) return []
  return (data as MissingPerson[]).map((p) => ({ ...p, source: 'live' as const }))
}

function mergePeople(lists: MissingPerson[][]): MissingPerson[] {
  const map = new Map<string, MissingPerson>()
  for (const list of lists) {
    for (const p of list) {
      const prev = map.get(p.id)
      if (!prev) {
        map.set(p.id, p)
        continue
      }
      // Prefer higher verification counts / found status
      map.set(p.id, {
        ...prev,
        ...p,
        verify_alive: Math.max(prev.verify_alive, p.verify_alive),
        verify_dead: Math.max(prev.verify_dead, p.verify_dead),
        status:
          prev.status !== 'missing'
            ? prev.status
            : p.status !== 'missing'
              ? p.status
              : 'missing',
        photo: p.photo?.startsWith('data:') ? prev.photo || p.photo : p.photo || prev.photo,
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function resolvePhotoUrl(photo: string): string {
  if (!photo) return ''
  if (photo.startsWith('data:') || photo.startsWith('http') || photo.startsWith('blob:')) {
    return photo
  }
  if (photo.startsWith('./') || photo.startsWith('/')) return photo
  return `./missing/photos/${photo}`
}

export async function fetchMissingPeople(): Promise<MissingPerson[]> {
  const [github, live, local] = await Promise.all([
    fetchGithubCatalog(),
    fetchLive(),
    Promise.resolve(loadLocal()),
  ])
  return mergePeople([github, live, local])
}

export async function submitMissingPerson(
  input: NewMissingInput,
): Promise<{ ok: boolean; person?: MissingPerson; error?: string }> {
  const name = input.name.trim()
  const place = input.last_seen_place.trim()
  if (!name || !place || !input.photoDataUrl) {
    return { ok: false, error: 'need_fields' }
  }

  const id = crypto.randomUUID()
  const person: MissingPerson = {
    id,
    name,
    photo: input.photoDataUrl,
    gender: input.gender,
    age_note: input.age_note?.trim() || null,
    last_seen_place: place,
    last_seen_date: input.last_seen_date || null,
    grid_lat: input.grid_lat,
    grid_lng: input.grid_lng,
    description: input.description?.trim() || null,
    contact_note: input.contact_note?.trim() || null,
    status: 'missing',
    verify_alive: 0,
    verify_dead: 0,
    created_at: new Date().toISOString(),
    source: 'local',
  }

  const local = loadLocal()
  local.unshift(person)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('missing_people').insert({
      id: person.id,
      name: person.name,
      photo: person.photo,
      gender: person.gender,
      age_note: person.age_note,
      last_seen_place: person.last_seen_place,
      last_seen_date: person.last_seen_date,
      grid_lat: person.grid_lat,
      grid_lng: person.grid_lng,
      description: person.description,
      contact_note: person.contact_note,
      status: person.status,
      verify_alive: 0,
      verify_dead: 0,
      created_at: person.created_at,
      hidden: false,
    })
    if (!error) {
      person.source = 'live'
      saveLocal(local.map((p) => (p.id === id ? person : p)))
    }
  }

  return { ok: true, person }
}

export async function prepareMissingPhoto(file: File): Promise<string> {
  return compressImageToDataUrl(file)
}

function applyThreshold(p: MissingPerson): MissingPerson {
  if (p.status !== 'missing') return p
  if (p.verify_alive >= MISSING_VERIFY_THRESHOLD) {
    return { ...p, status: 'found_alive' }
  }
  if (p.verify_dead >= MISSING_VERIFY_THRESHOLD) {
    return { ...p, status: 'found_dead' }
  }
  return p
}

export function hasVoted(personId: string): FoundOutcome | null {
  return loadVotes()[personId] ?? null
}

export async function verifyFound(
  personId: string,
  outcome: FoundOutcome,
): Promise<{ ok: boolean; person?: MissingPerson; error?: string }> {
  const votes = loadVotes()
  if (votes[personId]) return { ok: false, error: 'already' }

  const all = await fetchMissingPeople()
  const target = all.find((p) => p.id === personId)
  if (!target) return { ok: false, error: 'missing' }
  if (target.status !== 'missing') return { ok: false, error: 'resolved' }

  votes[personId] = outcome
  saveVotes(votes)

  const next: MissingPerson = applyThreshold({
    ...target,
    verify_alive: target.verify_alive + (outcome === 'alive' ? 1 : 0),
    verify_dead: target.verify_dead + (outcome === 'dead' ? 1 : 0),
  })

  // Persist count on local copy
  const local = loadLocal()
  const idx = local.findIndex((p) => p.id === personId)
  if (idx >= 0) {
    local[idx] = { ...local[idx], ...next }
    saveLocal(local)
  } else {
    local.unshift(next)
    saveLocal(local)
  }

  if (supabaseConfigured && supabase) {
    await supabase.from('missing_found_votes').upsert({
      person_id: personId,
      device_id: deviceId(),
      outcome,
    })
    await supabase
      .from('missing_people')
      .update({
        verify_alive: next.verify_alive,
        verify_dead: next.verify_dead,
        status: next.status,
      })
      .eq('id', personId)
  }

  return { ok: true, person: next }
}

/** Download a pack the maintainer can drop into public/missing/ on GitHub. */
export function downloadGithubPack(person: MissingPerson) {
  const photoName = `${person.id}.jpg`
  const entry = {
    ...person,
    photo: `./missing/photos/${photoName}`,
    source: 'github',
  }
  // JSON entry
  const jsonBlob = new Blob([JSON.stringify(entry, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(jsonBlob)
  a.download = `${person.id}.json`
  a.click()
  URL.revokeObjectURL(a.href)

  if (person.photo.startsWith('data:')) {
    const a2 = document.createElement('a')
    a2.href = person.photo
    a2.download = photoName
    a2.click()
  }
}
