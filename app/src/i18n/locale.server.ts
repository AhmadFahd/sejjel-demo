import { getCookie } from '@tanstack/react-start/server'
import { resolveLocale } from './locales'
import { LOCALE_COOKIE } from './server'
import type { Locale } from './locales'

/**
 * Server-only: the visitor's language before anything is known about who they
 * are. A first-time visitor gets Arabic whatever their browser prefers —
 * this is a Saudi shop's ledger, and the switch is one tap away.
 */
export function localeFromCookie(): Locale {
  return resolveLocale(getCookie(LOCALE_COOKIE))
}
