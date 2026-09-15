import type { CategoryId, TimeBand } from '../types'

/** Categories that get dedicated measure lists on Stats */
export const MEASURE_CATEGORIES: CategoryId[] = [
  'followed',
  'grabbed',
  'harassment',
  'lift_wrong',
  'red_flag',
  'unsafe_around_someone',
  'missing',
  'possible_remains',
  'body_dump',
]

export type AreaCaution = 'notice' | 'aware' | 'caution'

export function areaCaution(reportCount: number, hasSevere: boolean): AreaCaution {
  if (hasSevere || reportCount >= 4) return 'caution'
  if (reportCount >= 2) return 'aware'
  return 'notice'
}

export function isSevereCategory(c: CategoryId): boolean {
  return c === 'body_dump' || c === 'possible_remains' || c === 'grabbed' || c === 'missing'
}

export type AreaStat = {
  key: string
  lat: number
  lng: number
  count: number
  topCategories: CategoryId[]
  topTime: TimeBand | null
  caution: AreaCaution
}
