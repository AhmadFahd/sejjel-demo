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
 * The way in to one side of the ledger, and the whole of it: who is asking,
 * whether they may be here, and what is unread on the bell. A person who is
 * not signed in goes to the sign-in screen, and a shopkeeper who opens the
 * customer's screens goes to their own side rather than to a screen that
 * would show them nothing.
 *
 * #79: this belongs to the side's layout and to its `loader`, not its
 * `beforeLoad`. A `beforeLoad` re-runs on every navigation with no staleness
 * check of any kind and holds up the screen's own loader behind it, so every
 * tap inside a side paid for this answer again, one round trip before the
 * one that fetched anything. A loader keeps what it read.
 *
 * The guard travels with it, which means it is answered from what the layout
 * read rather than re-asked per screen. That is a redirect for somebody's
 * convenience, not a lock: every server function reads the person again and
 * scopes its own query, so a cached answer here cannot show anyone a balance
 * that is not theirs.
 */
export async function enterSide(
  side: Side,
): Promise<Entry & { person: SignedInUser }> {
  const entry = await readEntry()
  if (!entry.person) throw redirect({ to: '/sign-in' })
  if (!canSee(entry.person.roles, side)) {
    throw redirect({ to: homeFor(entry.person.roles) })
  }

  return { person: entry.person, unread: entry.unread }
}
