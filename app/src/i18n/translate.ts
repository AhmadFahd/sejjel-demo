import { ar } from './messages/ar'
import { en } from './messages/en'
import type { MessageKey, Messages } from './messages/en'
import type { Locale } from './locales'

export const CATALOGUES: Record<Locale, Messages> = { ar, en }

export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string

/** `{percent}` and friends. No plural rules yet; nothing needs them. */
export function createTranslate(locale: Locale): Translate {
  const catalogue = CATALOGUES[locale]

  return (key, params) => {
    const message = catalogue[key]
    if (!params) return message
    return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in params ? String(params[name]) : whole,
    )
  }
}
