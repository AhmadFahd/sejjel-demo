import { eq } from 'drizzle-orm'
import { readSignedInUser } from '#/auth/session.server'
import { getDatabase } from '#/db/client'
import { users } from '#/db/schema'
import type { Locale } from './locales'

/** Server-only: the cookie is for a visitor, the row is for a person. */
export async function saveLocaleForSignedInUser(locale: Locale) {
  const user = await readSignedInUser()
  if (!user) return

  await getDatabase()
    .update(users)
    .set({ locale, updatedAt: new Date() })
    .where(eq(users.id, user.id))
}
