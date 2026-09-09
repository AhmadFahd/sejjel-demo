import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { DEFAULT_LOCALE, isLocale, resolveLocale } from './locales'
import type { Locale } from './locales'

export const LOCALE_COOKIE = 'sejjel_locale'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * A signed-in person's choice lives on their row, so it follows them to another
 * phone. Everyone else gets the cookie, and a first-time visitor gets Arabic
 * whatever their browser prefers: this is a Saudi shop's ledger, and the switch
 * is one tap away.
 */
export const loadLocale = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Locale> => {
    const { readSignedInUser } = await import('#/auth/session.server')
    const user = await readSignedInUser()
    return user ? user.locale : resolveLocale(getCookie(LOCALE_COOKIE))
  },
)

export const changeLocale = createServerFn({ method: 'POST' })
  .validator((input: unknown): Locale =>
    isLocale(input) ? input : DEFAULT_LOCALE,
  )
  .handler(async ({ data }) => {
    setCookie(LOCALE_COOKIE, data, {
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
      sameSite: 'lax',
      httpOnly: false,
    })

    const { saveLocaleForSignedInUser } = await import('./server.db')
    await saveLocaleForSignedInUser(data)
    return data
  })
