import { createContext, useContext } from 'react'
import type { Lang } from '../types'
import { en, type Dict } from './en'
import { st } from './st'
import { zu } from './zu'

const dicts: Record<Lang, Dict> = { en, zu, st }

export function getDict(lang: Lang): Dict {
  return dicts[lang] ?? en
}

export const I18nContext = createContext<{
  lang: Lang
  t: Dict
  setLang: (l: Lang) => void
}>({
  lang: 'en',
  t: en,
  setLang: () => {},
})

export function useI18n() {
  return useContext(I18nContext)
}

export { en, zu, st }
