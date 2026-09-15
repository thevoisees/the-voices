const REPORT_DRAFT = 'thevoices_report_draft'
const MISSING_DRAFT = 'thevoices_missing_draft'

export function saveReportDraft(data: unknown) {
  localStorage.setItem(REPORT_DRAFT, JSON.stringify(data))
}

export function loadReportDraft<T>(): T | null {
  try {
    const raw = localStorage.getItem(REPORT_DRAFT)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function clearReportDraft() {
  localStorage.removeItem(REPORT_DRAFT)
}

export function saveMissingDraft(data: unknown) {
  localStorage.setItem(MISSING_DRAFT, JSON.stringify(data))
}

export function loadMissingDraft<T>(): T | null {
  try {
    const raw = localStorage.getItem(MISSING_DRAFT)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function clearMissingDraft() {
  localStorage.removeItem(MISSING_DRAFT)
}
