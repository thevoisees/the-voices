import { compressImageToDataUrl, dataUrlToJpegBlob } from './image'
import { uploadMissingPhotoToCloudinary } from './cloudinary'
import { DISPUTE_THRESHOLD, FLAG_THRESHOLD, getDeviceId } from './device'
import { supabase, supabaseConfigured } from './supabase'
import type {
  FoundOutcome,
  MissingPerson,
  NewMissingInput,
} from '../types-missing'
import { MISSING_VERIFY_THRESHOLD } from '../types-missing'

const LOCAL_KEY = 'thevoices_missing_people'
const VOTES_KEY = 'thevoices_missing_votes'
const FLAGS_KEY = 'thevoices_missing_flags'
const DISPUTES_KEY = 'thevoices_missing_disputes'
const CATALOG_URL = './missing/people.json'
const PHOTO_BUCKET = 'missing-photos'

function loadLocal(): MissingPerson[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as MissingPerson[]).filter((p) => !p.hidden)
  } catch {
    return []
  }
}

function saveLocal(list: MissingPerson[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

function loadAllLocal(): MissingPerson[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MissingPerson[]
  } catch {
    return []
  }
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
  if (error || !data) {
    console.warn('missing_people fetch failed', error?.message)
    return []
  }
  return (data as MissingPerson[]).map((p) => ({ ...p, source: 'live' as const }))
}

function preferPhoto(a: string, b: string): string {
  if (a.startsWith('http')) return a
  if (b.startsWith('http')) return b
  if (a.startsWith('./') || a.startsWith('/')) return a
  if (b.startsWith('./') || b.startsWith('/')) return b
  return a || b
}

function mergePeople(lists: MissingPerson[][]): MissingPerson[] {
  const map = new Map<string, MissingPerson>()
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
        verify_alive: Math.max(prev.verify_alive ?? 0, p.verify_alive ?? 0),
        verify_dead: Math.max(prev.verify_dead ?? 0, p.verify_dead ?? 0),
        flag_count: Math.max(prev.flag_count ?? 0, p.flag_count ?? 0),
        dispute_count: Math.max(prev.dispute_count ?? 0, p.dispute_count ?? 0),
        status:
          prev.status !== 'missing'
            ? prev.status
            : p.status !== 'missing'
              ? p.status
              : 'missing',
        photo: preferPhoto(p.photo, prev.photo),
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

async function uploadPhotoToSupabase(id: string, dataUrl: string): Promise<string | null> {
  if (!supabaseConfigured || !supabase) return null
  const path = `${id}.jpg`
  const blob = dataUrlToJpegBlob(dataUrl)
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) {
    console.warn('photo upload failed', error.message)
    return null
  }
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
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
): Promise<{ ok: boolean; person?: MissingPerson; error?: string; shared?: boolean }> {
  const name = input.name.trim()
  const place = input.last_seen_place.trim()
  if (!name || !place || !input.photoDataUrl) {
    return { ok: false, error: 'need_fields' }
  }

  const id = crypto.randomUUID()
  let photo = input.photoDataUrl
  let shared = false

  const fromCloud = await uploadMissingPhotoToCloudinary(id, input.photoDataUrl)
  if (fromCloud) {
    photo = fromCloud
  } else {
    const fromSb = await uploadPhotoToSupabase(id, input.photoDataUrl)
    if (fromSb) photo = fromSb
  }

  const person: MissingPerson = {
    id,
    name,
    photo,
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
    flag_count: 0,
    dispute_count: 0,
    hidden: false,
    created_at: new Date().toISOString(),
    source: 'local',
  }

  const local = loadAllLocal()
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
      flag_count: 0,
      dispute_count: 0,
      created_at: person.created_at,
      hidden: false,
    })
    if (!error) {
      shared = true
      person.source = 'live'
      saveLocal(local.map((p) => (p.id === id ? person : p)))
    } else {
      console.warn('missing_people insert failed', error.message)
    }
  }

  return { ok: true, person, shared }
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

export function hasFlaggedMissing(personId: string): boolean {
  return loadSet(FLAGS_KEY).has(personId)
}

export function hasDisputed(personId: string): boolean {
  return loadSet(DISPUTES_KEY).has(personId)
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

  const local = loadAllLocal()
  const idx = local.findIndex((p) => p.id === personId)
  if (idx >= 0) local[idx] = { ...local[idx], ...next }
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('missing_found_votes').upsert({
      person_id: personId,
      device_id: getDeviceId(),
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

export async function flagMissing(
  personId: string,
): Promise<{ ok: boolean; hidden?: boolean; error?: string }> {
  const flagged = loadSet(FLAGS_KEY)
  if (flagged.has(personId)) return { ok: false, error: 'already' }

  const all = loadAllLocal()
  let person = all.find((p) => p.id === personId)
  const liveList = await fetchMissingPeople()
  person = person || liveList.find((p) => p.id === personId)
  if (!person) return { ok: false, error: 'missing' }

  flagged.add(personId)
  saveSet(FLAGS_KEY, flagged)

  const flag_count = (person.flag_count ?? 0) + 1
  const hidden = flag_count >= FLAG_THRESHOLD
  const next = { ...person, flag_count, hidden }

  const local = loadAllLocal()
  const idx = local.findIndex((p) => p.id === personId)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('missing_flags').upsert({
      person_id: personId,
      device_id: getDeviceId(),
    })
    await supabase
      .from('missing_people')
      .update({ flag_count, hidden })
      .eq('id', personId)
  }

  return { ok: true, hidden }
}

export async function disputeFound(
  personId: string,
): Promise<{ ok: boolean; person?: MissingPerson; error?: string }> {
  const disputed = loadSet(DISPUTES_KEY)
  if (disputed.has(personId)) return { ok: false, error: 'already' }

  const all = await fetchMissingPeople()
  const target = all.find((p) => p.id === personId)
  if (!target) return { ok: false, error: 'missing' }
  if (target.status === 'missing') return { ok: false, error: 'not_found' }

  disputed.add(personId)
  saveSet(DISPUTES_KEY, disputed)

  const dispute_count = (target.dispute_count ?? 0) + 1
  let next: MissingPerson = { ...target, dispute_count }
  if (dispute_count >= DISPUTE_THRESHOLD) {
    next = {
      ...next,
      status: 'missing',
      verify_alive: 0,
      verify_dead: 0,
      dispute_count: 0,
    }
  }

  const local = loadAllLocal()
  const idx = local.findIndex((p) => p.id === personId)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('missing_disputes').upsert({
      person_id: personId,
      device_id: getDeviceId(),
    })
    await supabase
      .from('missing_people')
      .update({
        dispute_count: next.dispute_count,
        status: next.status,
        verify_alive: next.verify_alive,
        verify_dead: next.verify_dead,
      })
      .eq('id', personId)
  }

  return { ok: true, person: next }
}
