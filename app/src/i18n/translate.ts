import { ar } from './messages/ar'
import { en } from './messages/en'
import { DEFAULT_LOCALE, isLocale } from './locales'
import type { MessageKey, Messages } from './messages/en'
import type { Locale } from './locales'

export const CATALOGUES: Record<Locale, Messages> = { ar, en }

export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string

/**
 * `{percent}` and friends. No plural rules yet; nothing needs them.
 *
 * An unknown locale falls back rather than throwing: this runs while rendering
 * the shell, where an exception is a blank page rather than a wrong word.
 */
export function createTranslate(locale: Locale | undefined): Translate {
  const catalogue = CATALOGUES[isLocale(locale) ? locale : DEFAULT_LOCALE]

  return (key, params) => {
    const message = catalogue[key]
    if (!params) return message
    return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in params ? String(params[name]) : whole,
    )
  }
}
