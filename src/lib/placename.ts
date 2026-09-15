/** Approximate place names for map zones — local landmarks + reverse geocode cache. */

const CACHE_KEY = 'thevoices_placenames_v1'

type Cache = Record<string, string>

/** Known Ekurhuleni / East Rand landmarks (approx centres). */
const LANDMARKS: { name: string; lat: number; lng: number; radiusKm: number }[] = [
  { name: 'Rhodesfield', lat: -26.1226, lng: 28.2254, radiusKm: 1.8 },
  { name: 'Kempton Park (near R21)', lat: -26.098, lng: 28.225, radiusKm: 2.5 },
  { name: 'Olifantsfontein', lat: -25.958, lng: 28.218, radiusKm: 3 },
  { name: 'Tembisa', lat: -26.0105, lng: 28.2105, radiusKm: 4 },
  { name: 'Edenvale', lat: -26.1408, lng: 28.1524, radiusKm: 3 },
  { name: 'Boksburg', lat: -26.214, lng: 28.262, radiusKm: 4 },
  { name: 'Benoni', lat: -26.188, lng: 28.320, radiusKm: 4 },
  { name: 'OR Tambo / airport area', lat: -26.1392, lng: 28.246, radiusKm: 3 },
  { name: 'Isando', lat: -26.1405, lng: 28.209, radiusKm: 2.5 },
  { name: 'Birchleigh', lat: -26.083, lng: 28.245, radiusKm: 2 },
  { name: 'Norkem Park', lat: -26.065, lng: 28.255, radiusKm: 2 },
  { name: 'Clayville', lat: -25.975, lng: 28.225, radiusKm: 2.5 },
]

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}`
}

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Cache
  } catch {
    return {}
  }
}

function saveCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore quota */
  }
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Instant name from nearby known landmarks (no network). */
export function landmarkName(lat: number, lng: number): string | null {
  let best: { name: string; d: number } | null = null
  for (const p of LANDMARKS) {
    const d = haversineKm(lat, lng, p.lat, p.lng)
    if (d <= p.radiusKm && (!best || d < best.d)) best = { name: p.name, d }
  }
  return best?.name ?? null
}

function cachedName(lat: number, lng: number): string | null {
  return loadCache()[cacheKey(lat, lng)] ?? null
}

function remember(lat: number, lng: number, name: string) {
  const cache = loadCache()
  cache[cacheKey(lat, lng)] = name
  saveCache(cache)
}

/** Best name we already have without waiting on the network. */
export function peekPlaceName(lat: number, lng: number): string | null {
  return cachedName(lat, lng) ?? landmarkName(lat, lng)
}

type BigDataCloud = {
  locality?: string
  city?: string
  localityInfo?: {
    administrative?: { name: string; adminLevel: number }[]
  }
  principalSubdivision?: string
}

function formatRemote(data: BigDataCloud): string | null {
  const parts: string[] = []
  if (data.locality) parts.push(data.locality)
  if (data.city && data.city !== data.locality) parts.push(data.city)
  if (parts.length === 0 && data.principalSubdivision) {
    parts.push(data.principalSubdivision)
  }
  if (parts.length === 0) {
    const admins = data.localityInfo?.administrative ?? []
    const suburb = admins.find((a) => a.adminLevel >= 8 && a.adminLevel <= 10)
    const city = admins.find((a) => a.adminLevel === 6 || a.adminLevel === 7)
    if (suburb?.name) parts.push(suburb.name)
    if (city?.name && city.name !== suburb?.name) parts.push(city.name)
  }
  const joined = parts.filter(Boolean).join(', ')
  return joined || null
}

let queue: Promise<void> = Promise.resolve()

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/**
 * Resolve a human place name for a grid point.
 * Uses cache + landmarks first; may call BigDataCloud (browser-safe, no key).
 */
export async function resolvePlaceName(lat: number, lng: number): Promise<string> {
  const hit = cachedName(lat, lng)
  if (hit) return hit

  const landmark = landmarkName(lat, lng)

  return enqueue(async () => {
    const again = cachedName(lat, lng)
    if (again) return again

    try {
      const url =
        `https://api.bigdatacloud.net/data/reverse-geocode-client` +
        `?latitude=${encodeURIComponent(String(lat))}` +
        `&longitude=${encodeURIComponent(String(lng))}` +
        `&localityLanguage=en`
      const res = await fetch(url)
      if (res.ok) {
        const data = (await res.json()) as BigDataCloud
        const remote = formatRemote(data)
        if (remote) {
          remember(lat, lng, remote)
          return remote
        }
      }
    } catch {
      /* offline / blocked */
    }

    await new Promise((r) => setTimeout(r, 200))

    const fallback = landmark ?? `Near ${lat.toFixed(3)}, ${lng.toFixed(3)}`
    remember(lat, lng, fallback)
    return fallback
  })
}

/** Resolve several zones; returns a map of cacheKey → name. */
export async function resolvePlaceNames(
  points: { lat: number; lng: number }[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const p of points) {
    const name = await resolvePlaceName(p.lat, p.lng)
    out[cacheKey(p.lat, p.lng)] = name
  }
  return out
}

export function placeCacheKey(lat: number, lng: number): string {
  return cacheKey(lat, lng)
}
