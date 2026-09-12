import { createServerFn } from '@tanstack/react-start'
import { setCookie } from '@tanstack/react-start/server'
import { DEFAULT_LOCALE, isLocale } from './locales'
import type { Locale } from './locales'

export const LOCALE_COOKIE = 'sejjel_locale'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

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
