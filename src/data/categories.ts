import type { CategoryId } from '../types'

export interface CategoryMeta {
  id: CategoryId
  color: string
  /** i18n key suffix under categories.* */
  labelKey: string
  /** Public story text allowed on map detail */
  publicText: boolean
  /** Count-only on public map */
  countOnly: boolean
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'followed',
    color: '#c45c26',
    labelKey: 'followed',
    publicText: true,
    countOnly: false,
  },
  {
    id: 'grabbed',
    color: '#b91c1c',
    labelKey: 'grabbed',
    publicText: true,
    countOnly: false,
  },
  {
    id: 'harassment',
    color: '#a16207',
    labelKey: 'harassment',
    publicText: true,
    countOnly: false,
  },
  {
    id: 'lift_wrong',
    color: '#7c3aed',
    labelKey: 'lift_wrong',
    publicText: true,
    countOnly: false,
  },
  {
    id: 'red_flag',
    color: '#db2777',
    labelKey: 'red_flag',
    publicText: true,
    countOnly: false,
  },
  {
    id: 'unsafe_around_someone',
    color: '#0369a1',
    labelKey: 'unsafe_around_someone',
    publicText: false,
    countOnly: true,
  },
  {
    id: 'missing',
    color: '#0f766e',
    labelKey: 'missing',
    publicText: true,
    countOnly: false,
  },
  {
    id: 'possible_remains',
    color: '#44403c',
    labelKey: 'possible_remains',
    publicText: false,
    countOnly: true,
  },
  {
    id: 'body_dump',
    color: '#1c1917',
    labelKey: 'body_dump',
    publicText: false,
    countOnly: true,
  },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryMeta>

/** Heat weight by reporter role */
export function roleWeight(role: string): number {
  if (role === 'self') return 1
  if (role === 'other') return 0.6
  return 0.4
}
