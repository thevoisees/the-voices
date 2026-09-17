/** Community care: sightings, search squads, neighborhood forums */

export type SearchStatus = 'recruiting' | 'active' | 'closed'

export type DataSource = 'local' | 'live'

export interface MissingSighting {
  id: string
  created_at: string
  person_id: string
  place_text: string
  when_text: string
  note: string | null
  grid_lat: number | null
  grid_lng: number | null
  confirm_count: number
  flag_count?: number
  hidden?: boolean
  source: DataSource
}

export type NewSightingInput = {
  person_id: string
  place_text: string
  when_text: string
  note?: string | null
  grid_lat?: number | null
  grid_lng?: number | null
}

export interface SearchSquad {
  id: string
  created_at: string
  search_id: string
  label: string
  meet_place: string
  meet_when: string
  grid_lat: number | null
  grid_lng: number | null
  marshal_name: string | null
  marshal_contact: string | null
  join_count: number
}

export interface SearchCall {
  id: string
  created_at: string
  person_id: string
  area_text: string
  grid_lat: number | null
  grid_lng: number | null
  when_text: string
  guidance: string | null
  status: SearchStatus
  marshal_name: string | null
  marshal_contact: string | null
  forum_id: string | null
  flag_count?: number
  hidden?: boolean
  source: DataSource
  squads: SearchSquad[]
}

export type NewSquadInput = {
  label: string
  meet_place: string
  meet_when: string
  grid_lat?: number | null
  grid_lng?: number | null
  marshal_name?: string | null
  marshal_contact?: string | null
}

export type NewSearchInput = {
  person_id: string
  area_text: string
  when_text: string
  guidance?: string | null
  grid_lat?: number | null
  grid_lng?: number | null
  marshal_name?: string | null
  marshal_contact?: string | null
  forum_id?: string | null
  squads: NewSquadInput[]
}

export interface NeighborhoodForum {
  id: string
  created_at: string
  name: string
  area_text: string
  grid_lat: number | null
  grid_lng: number | null
  convenor_name: string
  convenor_contact: string
  associates_text: string | null
  about: string | null
  what_we_do: string | null
  flag_count?: number
  hidden?: boolean
  source: DataSource
}

export type NewForumInput = {
  name: string
  area_text: string
  convenor_name: string
  convenor_contact: string
  associates_text?: string | null
  about?: string | null
  what_we_do?: string | null
  grid_lat?: number | null
  grid_lng?: number | null
}
