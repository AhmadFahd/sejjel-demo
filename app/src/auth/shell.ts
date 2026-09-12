import { createServerFn } from '@tanstack/react-start'
import { DEFAULT_LOCALE } from '#/i18n/locales'
import type { Locale } from '#/i18n/locales'

/** What the document itself needs before any screen inside it renders. */
export type Shell = {
  locale: Locale
  signedIn: boolean
  /** UC-14: this person's own choice, so it holds after a reload. */
  hideAmounts: boolean
}

/**
 * One read of the session for the whole shell. The language and whether the
 * amounts are hidden both follow the person rather than the device, and both
 * are wanted before the first screen paints, so they are fetched together.
 */
export const loadShell = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Shell> => {
    const { localeFromCookie } = await import('#/i18n/locale.server')
    const fromCookie = localeFromCookie()

    try {
      const { readSignedInUser } = await import('./session.server')
      const user = await readSignedInUser()
      return {
        locale: user ? user.locale : fromCookie,
        signedIn: user !== null,
        hideAmounts: user?.hideAmounts ?? false,
      }
    } catch (error) {
      // Which language to render in is not worth a blank page. Say so loudly
      // and carry on with what the cookie knows.
      const { log, describeError } = await import('#/lib/log')
      log.error('Could not read the session while rendering the shell', {
        error: describeError(error),
      })
      return { locale: fromCookie, signedIn: false, hideAmounts: false }
    }
  },
)

export const DEFAULT_SHELL: Shell = {
  locale: DEFAULT_LOCALE,
  signedIn: false,
  hideAmounts: false,
}

/**
 * UC-14: the eye. The row is the store, so the choice is this person's on
 * whatever phone they pick up, and nothing about what the server sends
 * changes — only what the screen draws.
 */
export const setHideAmounts = createServerFn({ method: 'POST' })
  .validator((input: unknown): boolean => Boolean(input))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { users } = await import('#/db/schema')
    const { eq } = await import('drizzle-orm')
    const user = await requireSignedInUser()

    await getDatabase()
      .update(users)
      .set({ hideAmounts: data, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    return { hideAmounts: data }
  })
