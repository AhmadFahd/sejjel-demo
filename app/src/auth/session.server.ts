import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { getAuth } from './server'
import { getDatabase } from '#/db/client'
import { users } from '#/db/schema'
import { DEFAULT_LOCALE, isLocale } from '#/i18n/locales'
import { resolveRoles } from './roles.server'
import type { SignedInUser } from './session'

/**
 * Server-only, and kept apart from the server functions that call it: this
 * module reaches for the request, the database and Better Auth, none of which
 * may end up in a browser bundle.
 */

/**
 * The person, once per request. Rendering a document asks who is looking from
 * the shell, the guard, the layout and the screen, and each answer used to be
 * its own trip to the database; they share one now. The key is the request
 * itself, so nothing is held after it is answered, and two requests never see
 * each other's person.
 */
const perRequest = new WeakMap<Request, Promise<SignedInUser | null>>()

/** Who is asking, or nobody. Read from the session row, never from the client. */
export function readSignedInUser(): Promise<SignedInUser | null> {
  const request = getRequest()
  const answered = perRequest.get(request)
  if (answered) return answered

  const reading = readPerson().catch((error: unknown) => {
    // A failed read is not the answer for the rest of the request: whoever
    // asks next gets to try again.
    perRequest.delete(request)
    throw error
  })
  perRequest.set(request, reading)
  return reading
}

async function readPerson(): Promise<SignedInUser | null> {
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
    roles: await resolveRoles(row.id),
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
