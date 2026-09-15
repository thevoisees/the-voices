/** Parse and build deep links for map spots and petitions. */

export function readDeepLink(): {
  petitionId: string | null
  spotKey: string | null
} {
  const q = new URLSearchParams(window.location.search)
  return {
    petitionId: q.get('petition'),
    spotKey: q.get('spot'),
  }
}

export function spotShareUrl(gridKey: string): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}?spot=${encodeURIComponent(gridKey)}`
}

export function openWhatsAppSpotShare(gridKey: string, siteName: string) {
  const link = spotShareUrl(gridKey)
  const text = [
    `*${siteName}*`,
    '',
    'Look at this area on the map — places and patterns, not names.',
    '',
    link,
  ].join('\n')
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
}

export function clearDeepLinkParams() {
  const url = new URL(window.location.href)
  url.searchParams.delete('petition')
  url.searchParams.delete('spot')
  window.history.replaceState({}, '', url.pathname + url.hash)
}
