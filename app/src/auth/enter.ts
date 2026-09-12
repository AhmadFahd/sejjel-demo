import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { canSee, homeFor } from './roles'
import type { SignedInUser } from './session'
import type { Side } from './roles'

/**
 * What every screen behind the front door needs before it draws: who is
 * asking, and how much they have not read. One question to the server, where
 * the shell, the guard, the profile and the bell each used to ask their own —
 * four answers about the same person, read four times over the network.
 */
export type Entry = {
  person: SignedInUser | null
  unread: number
}

const readEntry = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Entry> => {
    const { readSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { countUnread } = await import('#/db/queries/notifications')

    const person = await readSignedInUser()
    if (!person) return { person: null, unread: 0 }

    return { person, unread: await countUnread(getDatabase(), person.id) }
  },
)

/**
 * The way in to a side of the ledger. A person who is not signed in goes to
 * the sign-in screen, and the answer is handed down as route context so the
 * screens under it do not ask again.
 */
export async function enterApp(): Promise<Entry & { person: SignedInUser }> {
  const entry = await readEntry()
  if (!entry.person) throw redirect({ to: '/sign-in' })
  return { person: entry.person, unread: entry.unread }
}

/**
 * The side itself, decided from the person the layout above already read: a
 * shopkeeper on the customer's screens goes to their own side rather than to
 * a screen that would show them nothing. No question to the server — this is
 * the answer that came with the way in.
 */
export function requireSideOf(person: SignedInUser, side: Side): SignedInUser {
  if (!canSee(person.roles, side)) throw redirect({ to: homeFor(person.roles) })
  return person
}
