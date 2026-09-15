export type ReporterRole = 'self' | 'bystander' | 'other'

export type TimeBand = 'morning' | 'afternoon' | 'evening' | 'night'

/** Gender of the person affected — not a name, not the reporter’s ID */
export type AffectedGender = 'woman' | 'man' | 'girl' | 'boy' | 'unknown'

export type CategoryId =
  | 'followed'
  | 'grabbed'
  | 'harassment'
  | 'lift_wrong'
  | 'red_flag'
  | 'unsafe_around_someone'
  | 'missing'
  | 'possible_remains'
  | 'body_dump'

export interface Report {
  id: string
  created_at: string
  grid_lat: number
  grid_lng: number
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
  hidden: boolean
  flag_count?: number
  source?: 'seed' | 'live' | 'local'
}

/** @deprecated legacy cell counter — prefer AreaPetition */
export interface Petition {
  grid_key: string
  count: number
  grid_lat: number
  grid_lng: number
}

export interface AreaPetition {
  id: string
  created_at: string
  title: string
  ask: string
  grid_key: string
  grid_lat: number
  grid_lng: number
  goal: number
  count: number
  flag_count: number
  hidden: boolean
  source?: 'live' | 'local'
}

export interface NotebookEntry {
  id: string
  created_at: string
  incident_date: string
  what_happened: string
  was_scared: boolean
  phone_taken: boolean
  area_note: string
}

export type Lang = 'en' | 'zu' | 'st'

export type Screen = 'map' | 'stats' | 'report' | 'notebook' | 'about'
