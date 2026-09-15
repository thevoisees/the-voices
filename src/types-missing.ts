import type { AffectedGender } from './types'

export type MissingStatus = 'missing' | 'found_alive' | 'found_dead'

export type FoundOutcome = 'alive' | 'dead'

export interface MissingPerson {
  id: string
  name: string
  /** Relative GitHub Pages path (./missing/photos/…) or data URL while pending */
  photo: string
  gender: AffectedGender | null
  age_note: string | null
  last_seen_place: string
  last_seen_date: string | null
  grid_lat: number | null
  grid_lng: number | null
  description: string | null
  /** Case number / “call SAPS” — no private home address */
  contact_note: string | null
  status: MissingStatus
  /** Votes that the person was seen found alive */
  verify_alive: number
  /** Votes that the person was seen found deceased */
  verify_dead: number
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

/** Crowd confirmations needed before status flips to found */
export const MISSING_VERIFY_THRESHOLD = 10
