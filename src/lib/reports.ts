import { SEED_REPORTS } from '../data/seed'
import type { AffectedGender, CategoryId, Report, ReporterRole, TimeBand } from '../types'
import { FLAG_THRESHOLD, getDeviceId } from './device'
import { snapToGrid } from './grid'
import { stripIdentity } from './strip'
import { supabase, supabaseConfigured } from './supabase'

const LOCAL_KEY = 'healsa_local_reports'

function loadLocal(): Report[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Report[]
    return parsed.map((r) => ({
      ...r,
      affected_gender: r.affected_gender ?? null,
    }))
  } catch {
    return []
  }
}

function saveLocal(reports: Report[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(reports))
}

export type NewReportInput = {
  lat: number
  lng: number
  category: CategoryId
  reporter_role: ReporterRole
  affected_gender: AffectedGender | null
  time_band: TimeBand | null
  incident_date: string | null
  what_happened: string | null
  red_flag: string | null
  vehicle_color: string | null
  vehicle_type: string | null
  vehicle_direction: string | null
  involves_minor: boolean
}

function sanitizeForPublic(input: NewReportInput): Omit<Report, 'id' | 'created_at' | 'hidden' | 'source'> {
  const g = snapToGrid(input.lat, input.lng)
  const countOnly =
    input.category === 'unsafe_around_someone' ||
    input.category === 'possible_remains' ||
    input.involves_minor

  let what = stripIdentity(input.what_happened)
  let flag = stripIdentity(input.red_flag)

  if (countOnly || input.category === 'body_dump') {
    what = null
    flag = null
  }
  if (input.category === 'possible_remains') {
    what = null
    flag = null
  }

  return {
    grid_lat: Number(g.lat.toFixed(4)),
    grid_lng: Number(g.lng.toFixed(4)),
    category: input.category,
    reporter_role: input.reporter_role,
    affected_gender: input.affected_gender,
    time_band: input.time_band,
    incident_date: input.incident_date,
    what_happened: what,
    red_flag: flag,
    vehicle_color: stripIdentity(input.vehicle_color),
    vehicle_type: stripIdentity(input.vehicle_type),
    vehicle_direction: stripIdentity(input.vehicle_direction),
    involves_minor: input.involves_minor,
    flag_count: 0,
  }
}

export async function fetchReports(): Promise<Report[]> {
  const local = loadLocal()
  if (!supabaseConfigured || !supabase) {
    return [...SEED_REPORTS, ...local]
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    console.warn('Supabase fetch failed, using seed + local', error.message)
    return [...SEED_REPORTS, ...local]
  }

  const live = (data as Report[]).map((r) => ({
    ...r,
    affected_gender: r.affected_gender ?? null,
    source: 'live' as const,
  }))
  // Keep seed visible even when live DB is empty
  const seedIds = new Set(SEED_REPORTS.map((s) => s.id))
  const withoutDupSeed = live.filter((r) => !seedIds.has(r.id))
  return [...SEED_REPORTS, ...withoutDupSeed, ...local.filter((l) => l.source === 'local')]
}

export async function submitReport(input: NewReportInput): Promise<{ ok: boolean; error?: string }> {
  const row = sanitizeForPublic(input)
  const full: Report = {
    ...row,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    hidden: false,
    source: supabaseConfigured ? 'live' : 'local',
  }

  if (!supabaseConfigured || !supabase) {
    const local = loadLocal()
    local.unshift(full)
    saveLocal(local)
    return { ok: true }
  }

  const { error } = await supabase.from('reports').insert({
    ...row,
    hidden: false,
  })

  if (error) {
    // Fall back so the prototype still works
    const local = loadLocal()
    full.source = 'local'
    local.unshift(full)
    saveLocal(local)
    return { ok: true, error: `Saved locally (Supabase: ${error.message})` }
  }

  return { ok: true }
}

const REPORT_FLAGS_KEY = 'thevoices_report_flags'

function loadReportFlags(): Set<string> {
  try {
    const raw = localStorage.getItem(REPORT_FLAGS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function hasFlaggedReport(reportId: string): boolean {
  return loadReportFlags().has(reportId)
}

export async function flagReport(
  reportId: string,
): Promise<{ ok: boolean; hidden?: boolean; error?: string }> {
  const flagged = loadReportFlags()
  if (flagged.has(reportId)) return { ok: false, error: 'already' }

  const local = loadLocal()
  let report = local.find((r) => r.id === reportId)
  if (!report) {
    const all = await fetchReports()
    report = all.find((r) => r.id === reportId)
  }
  if (!report) return { ok: false, error: 'missing' }

  flagged.add(reportId)
  localStorage.setItem(REPORT_FLAGS_KEY, JSON.stringify([...flagged]))

  const flag_count = (report.flag_count ?? 0) + 1
  const hidden = flag_count >= FLAG_THRESHOLD

  const idx = local.findIndex((r) => r.id === reportId)
  const next = { ...report, flag_count, hidden }
  if (idx >= 0) {
    local[idx] = next
    saveLocal(local)
  } else if (hidden || report.source === 'local') {
    local.unshift(next)
    saveLocal(local)
  }

  if (supabaseConfigured && supabase) {
    await supabase.from('report_flags').upsert({
      report_id: reportId,
      device_id: getDeviceId(),
    })
    await supabase.from('reports').update({ flag_count, hidden }).eq('id', reportId)
  }

  return { ok: true, hidden }
}

