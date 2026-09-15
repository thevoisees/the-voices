import type { Report } from '../types'
import { snapToGrid } from '../lib/grid'

/**
 * Seed pins from the publicly reported Kempton Park / Ekurhuleni cases only.
 * No victim names. No demo / fictional incidents.
 */
function seedPin(
  id: string,
  lat: number,
  lng: number,
  category: Report['category'],
  time_band: Report['time_band'],
  created_at: string,
): Report {
  const g = snapToGrid(lat, lng)
  return {
    id,
    created_at,
    grid_lat: g.lat,
    grid_lng: g.lng,
    category,
    reporter_role: 'other',
    time_band,
    incident_date: created_at.slice(0, 10),
    what_happened: null,
    red_flag: null,
    vehicle_color: null,
    vehicle_type: null,
    vehicle_direction: null,
    involves_minor: false,
    hidden: false,
    source: 'seed',
  }
}

export const SEED_REPORTS: Report[] = [
  // Near R21 — 15 July 2026
  seedPin('seed-r21-jul', -26.1005, 28.2298, 'body_dump', 'morning', '2026-07-15T08:00:00.000Z'),
  // Near R21 — 24 August 2026
  seedPin('seed-r21-aug', -26.0952, 28.221, 'body_dump', 'afternoon', '2026-08-24T14:00:00.000Z'),
  // Rhodesfield — 10 September 2026
  seedPin('seed-rhodesfield-sep10', -26.1235, 28.2245, 'body_dump', 'night', '2026-09-10T22:00:00.000Z'),
  // Rhodesfield — 12 September 2026
  seedPin('seed-rhodesfield-sep12', -26.1218, 28.2262, 'body_dump', 'evening', '2026-09-12T19:00:00.000Z'),
  // Olifantsfontein / R21 — 14 September 2026
  seedPin('seed-olifantsfontein', -25.958, 28.218, 'body_dump', 'morning', '2026-09-14T07:00:00.000Z'),
]
