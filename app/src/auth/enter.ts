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
 * The way in to the screens behind the front door: who is asking, and what is
 * unread on the bell. Somebody who is not signed in goes to the sign-in
 * screen.
 *
 * #79: this belongs in the side layout's `loader`, not its `beforeLoad`. A
 * `beforeLoad` re-runs for every match on every load with no staleness check
 * of any kind, and the screen's own loader cannot start until it comes back,
 * so every tap inside a side paid for this answer again — one round trip in
 * front of the one that fetched anything. A loader keeps what it read.
 */
export async function enterApp(): Promise<Entry & { person: SignedInUser }> {
  const entry = await readEntry()
  if (!entry.person) throw redirect({ to: '/sign-in' })
  return { person: entry.person, unread: entry.unread }
}

/**
 * The side, per screen, answered from what the layout above already read: a
 * shopkeeper who opens the customer's screens goes to their own side rather
 * than to a screen that would show them nothing. No question to the server —
 * this waits on the layout's loader, which has the answer or is already
 * fetching it.
 *
 * Per screen rather than per side, because one screen under `/customer` is
 * open to anybody signed in: the card, which is how a person no shop has
 * connected yet gets connected. Moving this up to the layout took the card
 * away from exactly the people it is for, and the browser suite said so.
 *
 * It is a redirect for somebody's convenience, not a lock. Every server
 * function reads the person again and scopes its own query, so nothing here
 * can show anyone a balance that is not theirs.
 */
export async function requireSide<
  TParentMatch extends { loaderData?: { person: SignedInUser } | undefined },
>(parentMatch: Promise<TParentMatch>, side: Side): Promise<SignedInUser> {
  const person = (await parentMatch).loaderData?.person
  if (!person) throw redirect({ to: '/sign-in' })
  if (!canSee(person.roles, side)) throw redirect({ to: homeFor(person.roles) })
  return person
}
