import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { DEFAULT_LOCALE, isLocale, resolveLocale } from './locales'
import type { Locale } from './locales'

export const LOCALE_COOKIE = 'sejjel_locale'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * A first-time visitor gets Arabic, whatever their browser prefers: this is a
 * Saudi shop's ledger, and the switch is one tap away. Only a choice already
 * made is honoured. Once accounts exist (#20) that choice belongs on the user
 * row, and the cookie becomes the copy for someone not signed in.
 */
export const loadLocale = createServerFn({ method: 'GET' }).handler(
  (): Locale => resolveLocale(getCookie(LOCALE_COOKIE)),
)

export const changeLocale = createServerFn({ method: 'POST' })
  .validator((input: unknown): Locale =>
    isLocale(input) ? input : DEFAULT_LOCALE,
  )
  .handler(({ data }) => {
    setCookie(LOCALE_COOKIE, data, {
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
      sameSite: 'lax',
      httpOnly: false,
    })
    return data
  })
