/** Shared anonymous device id for flags, votes, petition signs */
const DEVICE_KEY = 'thevoices_device_id'

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export const FLAG_THRESHOLD = 5
export const DISPUTE_THRESHOLD = 5
export const DEFAULT_PETITION_GOAL = 20
