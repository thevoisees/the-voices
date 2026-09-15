/** Strip identity / contact patterns before anything goes public */

const PHONE =
  /(?:\+?27|0)\s*\d[\d\s-]{7,12}\d|\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/gi
const SA_ID = /\b\d{13}\b/g
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const HANDLE = /@[a-zA-Z0-9_]{2,}/g
const NAME_INTRO =
  /\b(my name is|i am|i'm|ek is|igama lami|ke nna)\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'-]{1,30}(\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'-]{1,30})?/gi
const PLATE = /\b[A-Z]{1,3}\s?\d{1,3}[\s-]?[A-Z]{2,3}\s?\d{0,3}\b/gi
const URL = /https?:\/\/\S+/gi

const MAX_LEN = 280

export function stripIdentity(input: string | null | undefined): string | null {
  if (!input) return null
  let t = input.trim()
  if (!t) return null
  t = t
    .replace(PHONE, '[removed]')
    .replace(SA_ID, '[removed]')
    .replace(EMAIL, '[removed]')
    .replace(HANDLE, '[removed]')
    .replace(NAME_INTRO, '[removed]')
    .replace(PLATE, '[removed]')
    .replace(URL, '[removed]')
  // Drop lines that look like "Name Surname" only
  t = t
    .split('\n')
    .filter((line) => !/^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'-]+\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'-]+(\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'-]+)?\.?$/.test(line.trim()))
    .join('\n')
  t = t.replace(/\s{2,}/g, ' ').trim()
  if (t.length > MAX_LEN) t = t.slice(0, MAX_LEN).trim()
  return t || null
}

export function looksLikeIdentityLeak(text: string | null | undefined): boolean {
  if (!text) return false
  if (PHONE.test(text) || SA_ID.test(text) || EMAIL.test(text) || PLATE.test(text)) {
    // reset lastIndex for global regexes
    PHONE.lastIndex = 0
    SA_ID.lastIndex = 0
    EMAIL.lastIndex = 0
    PLATE.lastIndex = 0
    return true
  }
  PHONE.lastIndex = 0
  SA_ID.lastIndex = 0
  EMAIL.lastIndex = 0
  PLATE.lastIndex = 0
  return false
}
