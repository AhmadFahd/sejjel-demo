import { createServerFn } from '@tanstack/react-start'
import type { Locale } from '#/i18n/locales'

export type SignedInUser = {
  id: string
  name: string
  phoneNumber: string
  locale: Locale
  hideAmounts: boolean
}

/**
 * The server-only work is imported inside the handlers, so importing this file
 * from a component does not drag the database into the browser bundle.
 */
export const loadSignedInUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SignedInUser | null> => {
    try {
      const { readSignedInUser } = await import('./session.server')
      return await readSignedInUser()
    } catch (error) {
      // Nobody, as far as this page is concerned. A broken session store is a
      // signed-out visitor, not a five hundred.
      const { log, describeError } = await import('#/lib/log')
      log.error('Could not read the session', { error: describeError(error) })
      return null
    }
  },
)

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const { endSession } = await import('./session.server')
  await endSession()
  return { signedOut: true }
})
