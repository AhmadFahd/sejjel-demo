import { createServerFn } from '@tanstack/react-start'
import type { Notification } from '#/db/queries/notifications'

/** UC-12: the list. Opening it is what clears the count on the bell. */
export const loadNotifications = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<Notification>> => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { listNotifications, markAllRead } =
      await import('#/db/queries/notifications')
    const user = await requireSignedInUser()
    const db = getDatabase()

    const rows = await listNotifications(db, user.id)
    await markAllRead(db, user.id)
    return rows
  },
)

/**
 * What the badge draws. A count and nothing else: this runs on every screen
 * behind the front door, so it cannot afford to do the ledger's work. The
 * dates that came round are noticed by the dashboards, which have the figures
 * in hand already.
 */
export const countUnreadFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<number> => {
    const { readSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { countUnread } = await import('#/db/queries/notifications')
    const user = await readSignedInUser()
    if (!user) return 0

    return countUnread(getDatabase(), user.id)
  },
)
