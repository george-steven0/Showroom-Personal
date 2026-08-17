import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
import 'dayjs/locale/en'

import en from './locales/en.json'
import ar from './locales/ar.json'

export type Language = 'en' | 'ar'

export const LANGUAGES: { value: Language; label: string; dir: 'ltr' | 'rtl' }[] = [
  { value: 'en', label: 'English', dir: 'ltr' },
  { value: 'ar', label: 'العربية', dir: 'rtl' },
]

export function directionOf(language: Language): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'ar'],
  interpolation: { escapeValue: false },
  returnNull: false,
})

/** Keeps the document, dayjs and i18next in sync when the language changes. */
export function applyLanguage(language: Language) {
  const dir = directionOf(language)
  void i18n.changeLanguage(language)
  dayjs.locale(language === 'ar' ? 'ar' : 'en')
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
    document.documentElement.dir = dir
  }
}

export default i18n
