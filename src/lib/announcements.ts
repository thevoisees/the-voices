import type {
  AnnouncementKind,
  AnnouncementVoice,
  CommunityAnnouncement,
} from '../types'
import { FLAG_THRESHOLD, getDeviceId } from './device'
import { stripIdentity } from './strip'
import { supabase, supabaseConfigured } from './supabase'

const LOCAL_KEY = 'thevoices_announcements'
const FLAGS_KEY = 'thevoices_announcement_flags'

function loadLocal(): CommunityAnnouncement[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as CommunityAnnouncement[]).filter((a) => !a.hidden)
  } catch {
    return []
  }
}

function loadAllLocal(): CommunityAnnouncement[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CommunityAnnouncement[]
  } catch {
    return []
  }
}

function saveLocal(list: CommunityAnnouncement[]) {
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

function merge(lists: CommunityAnnouncement[][]): CommunityAnnouncement[] {
  const map = new Map<string, CommunityAnnouncement>()
  for (const list of lists) {
    for (const a of list) {
      if (a.hidden) continue
      const prev = map.get(a.id)
      if (!prev) {
        map.set(a.id, a)
        continue
      }
      map.set(a.id, {
        ...prev,
        ...a,
        flag_count: Math.max(prev.flag_count ?? 0, a.flag_count ?? 0),
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export async function fetchAnnouncements(): Promise<CommunityAnnouncement[]> {
  const local = loadLocal()
  if (!supabaseConfigured || !supabase) return local

  const { data, error } = await supabase
    .from('community_announcements')
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(300)

  if (error || !data) {
    console.warn('community_announcements fetch failed', error?.message)
    return local
  }

  const live = (data as CommunityAnnouncement[]).map((a) => ({
    ...a,
    source: 'live' as const,
  }))
  return merge([live, local])
}

export type NewAnnouncementInput = {
  title: string
  body: string
  kind: AnnouncementKind
  voice: AnnouncementVoice
  organizer: string
  when_text: string
  where_text: string
  join_note?: string | null
}

export async function createAnnouncement(
  input: NewAnnouncementInput,
): Promise<{ ok: boolean; announcement?: CommunityAnnouncement; error?: string }> {
  const title = stripIdentity(input.title.trim()) || ''
  const body = stripIdentity(input.body.trim()) || ''
  const organizer = stripIdentity(input.organizer.trim()) || ''
  const when_text = stripIdentity(input.when_text.trim()) || ''
  const where_text = stripIdentity(input.where_text.trim()) || ''
  const join_note = input.join_note?.trim()
    ? stripIdentity(input.join_note.trim())
    : null

  if (!title || !body || !organizer || !when_text || !where_text) {
    return { ok: false, error: 'need_fields' }
  }

  const announcement: CommunityAnnouncement = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    title,
    body,
    kind: input.kind,
    voice: input.voice,
    organizer,
    when_text,
    where_text,
    join_note,
    flag_count: 0,
    hidden: false,
    source: 'local',
  }

  const local = loadAllLocal()
  local.unshift(announcement)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('community_announcements').insert({
      id: announcement.id,
      created_at: announcement.created_at,
      title: announcement.title,
      body: announcement.body,
      kind: announcement.kind,
      voice: announcement.voice,
      organizer: announcement.organizer,
      when_text: announcement.when_text,
      where_text: announcement.where_text,
      join_note: announcement.join_note,
      flag_count: 0,
      hidden: false,
    })
    if (!error) {
      announcement.source = 'live'
      saveLocal(local.map((a) => (a.id === announcement.id ? announcement : a)))
    } else {
      console.warn('community_announcements insert failed', error.message)
    }
  }

  return { ok: true, announcement }
}

export function hasFlaggedAnnouncement(id: string): boolean {
  return loadSet(FLAGS_KEY).has(id)
}

export async function flagAnnouncement(
  id: string,
): Promise<{ ok: boolean; hidden?: boolean; error?: string }> {
  const flagged = loadSet(FLAGS_KEY)
  if (flagged.has(id)) return { ok: false, error: 'already' }

  const all = await fetchAnnouncements()
  const target = all.find((a) => a.id === id)
  if (!target) return { ok: false, error: 'missing' }

  flagged.add(id)
  saveSet(FLAGS_KEY, flagged)

  const flag_count = (target.flag_count ?? 0) + 1
  const hidden = flag_count >= FLAG_THRESHOLD
  const next = { ...target, flag_count, hidden }

  const local = loadAllLocal()
  const idx = local.findIndex((a) => a.id === id)
  if (idx >= 0) local[idx] = next
  else local.unshift(next)
  saveLocal(local)

  if (supabaseConfigured && supabase) {
    await supabase.from('announcement_flags').upsert({
      announcement_id: id,
      device_id: getDeviceId(),
    })
    await supabase
      .from('community_announcements')
      .update({ flag_count, hidden })
      .eq('id', id)
  }

  return { ok: true, hidden }
}

export function buildAnnouncementWhatsApp(
  a: CommunityAnnouncement,
  siteName: string,
): string {
  const kindLine =
    a.kind === 'march'
      ? 'March / gathering'
      : a.kind === 'prayer'
        ? 'Prayer meeting'
        : a.kind === 'vigil'
          ? 'Vigil'
          : a.kind === 'meeting'
            ? 'Meeting'
            : 'Community call'
  return [
    `*${siteName} — national announcement*`,
    '',
    `📢 ${a.title}`,
    a.body,
    '',
    `Type: ${kindLine}`,
    `By: ${a.organizer} (${a.voice === 'group' ? 'group' : 'individual'})`,
    `When: ${a.when_text}`,
    `Where: ${a.where_text}`,
    a.join_note ? `Join: ${a.join_note}` : '',
    '',
    `${window.location.origin}${window.location.pathname}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function openAnnouncementWhatsApp(a: CommunityAnnouncement, siteName: string) {
  const text = buildAnnouncementWhatsApp(a, siteName)
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
}
