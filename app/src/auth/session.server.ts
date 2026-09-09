import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { getAuth } from './server'
import { getDatabase } from '#/db/client'
import { users } from '#/db/schema'
import { DEFAULT_LOCALE, isLocale } from '#/i18n/locales'
import type { SignedInUser } from './session'

/**
 * Server-only, and kept apart from the server functions that call it: this
 * module reaches for the request, the database and Better Auth, none of which
 * may end up in a browser bundle.
 */

/** Who is asking, or nobody. Read from the session row, never from the client. */
export async function readSignedInUser(): Promise<SignedInUser | null> {
  const session = await getAuth().api.getSession({
    headers: getRequest().headers,
  })
  if (!session) return null

  // `.at` rather than destructuring: Drizzle types the first element as if a
  // row is always there, and a session can outlive the person it belongs to.
  const row = (
    await getDatabase()
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
  ).at(0)
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phoneNumber,
    locale: isLocale(row.locale) ? row.locale : DEFAULT_LOCALE,
    hideAmounts: row.hideAmounts,
  }
}

/**
 * For anything that touches a ledger. Throwing is the point: a route that
 * forgets to check cannot leak a balance.
 */
export async function requireSignedInUser(): Promise<SignedInUser> {
  const user = await readSignedInUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user
}

export async function endSession() {
  await getAuth().api.signOut({ headers: getRequest().headers })
}
