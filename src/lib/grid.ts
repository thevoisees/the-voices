/** ~180 m grid so pins mark a path/stretch, not a front door */
const GRID_DEG = 0.0016

export function snapToGrid(lat: number, lng: number): { lat: number; lng: number } {
  const latN = Math.round(lat / GRID_DEG) * GRID_DEG
  const lngN = Math.round(lng / GRID_DEG) * GRID_DEG
  return {
    lat: Number(latN.toFixed(4)),
    lng: Number(lngN.toFixed(4)),
  }
}

export function gridKey(lat: number, lng: number): string {
  const g = snapToGrid(lat, lng)
  return `${g.lat.toFixed(4)}_${g.lng.toFixed(4)}`
}

export function parseGridKey(key: string): { lat: number; lng: number } | null {
  const [a, b] = key.split('_')
  const lat = Number(a)
  const lng = Number(b)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lat, lng }
}
