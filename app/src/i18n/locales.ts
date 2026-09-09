export const LOCALES = ['ar', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ar'

export type Direction = 'rtl' | 'ltr'

export function directionOf(locale: Locale): Direction {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale)
}

/**
 * The nearest locale we have, from a stored choice or an Accept-Language
 * header. Arabic is the fallback: this is a Saudi shop's ledger.
 */
export function resolveLocale(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue
    for (const tag of candidate.split(',')) {
      const language = tag.split(';')[0]?.trim().slice(0, 2).toLowerCase()
      if (isLocale(language)) return language
    }
  }
  return DEFAULT_LOCALE
}
