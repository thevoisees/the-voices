import type { AffectedGender } from './types'

export type MissingStatus = 'missing' | 'found_alive' | 'found_dead'

export type FoundOutcome = 'alive' | 'dead'

export interface MissingPerson {
  id: string
  name: string
  photo: string
  gender: AffectedGender | null
  age_note: string | null
  last_seen_place: string
  last_seen_date: string | null
  grid_lat: number | null
  grid_lng: number | null
  description: string | null
  contact_note: string | null
  status: MissingStatus
  verify_alive: number
  verify_dead: number
  flag_count?: number
  dispute_count?: number
  hidden?: boolean
  created_at: string
  source: 'github' | 'local' | 'live'
}

export type NewMissingInput = {
  name: string
  photoDataUrl: string
  gender: AffectedGender | null
  age_note: string | null
  last_seen_place: string
  last_seen_date: string | null
  grid_lat: number | null
  grid_lng: number | null
  description: string | null
  contact_note: string | null
}

export type EditMissingInput = {
  name: string
  photoDataUrl?: string | null
  gender: AffectedGender | null
  age_note: string | null
  last_seen_place: string
  last_seen_date: string | null
  grid_lat: number | null
  grid_lng: number | null
  description: string | null
  contact_note: string | null
}

export const MISSING_VERIFY_THRESHOLD = 10
