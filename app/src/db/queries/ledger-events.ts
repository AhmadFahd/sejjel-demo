import { recordEvents } from './events'
import { notificationFor } from './notifications'
import { notifications } from '../schema'
import { wake } from '#/server/stream.server'
import type { Database } from '../client'
import type { EventKind } from './events'

export type Announcement = {
  userId: string
  kind: EventKind
  subjectId?: string
  /**
   * UC-12: skip the line in the person's list, for a change that moves their
   * screens without being news — a term that moved while the limit did not.
   */
  notify?: false
}

/**
 * Writing an event, putting the line in the person's list, and waking the
 * streams that care is one act, so no caller can do part of it: a row nobody
 * is woken for arrives late, a wake with no row behind it tells a
 * reconnecting client nothing, and an event with no notification is a thing
 * that happened to somebody who was never told.
 *
 * What each event puts in the list is derived from the event itself, in
 * `notificationFor`, rather than passed in beside it.
 */
export async function announce(db: Database, entries: Array<Announcement>) {
  const rows = await recordEvents(db, entries)

  const lines = entries
    .filter((entry) => entry.notify !== false)
    .map((entry) => notificationFor(entry, new Date()))
    .filter((line) => line !== null)

  if (lines.length > 0) {
    const written = await db.insert(notifications).values(lines).returning()
    await push(db, written)
  }

  wake(entries.map((entry) => entry.userId))
  return rows
}

/**
 * Out of the app and onto the device, through the interface from #18 whose
 * fake only writes a line to the log. The bell does not depend on it: the row
 * is already written above, so a push that fails costs a buzz, not the news.
 */
async function push(
  db: Database,
  written: Array<typeof notifications.$inferSelect>,
) {
  try {
    const { getProviders } = await import('#/providers/registry')
    const { createTranslate } = await import('#/i18n/translate')
    const { inArray } = await import('drizzle-orm')
    const { users } = await import('../schema')
    const { push: sender } = getProviders()

    // A push lands outside the app, where there is nobody's screen to take a
    // language from, so it takes each person's own off their row.
    const people = await db
      .select({ id: users.id, locale: users.locale })
      .from(users)
      .where(inArray(users.id, [...new Set(written.map((r) => r.userId))]))
    const localeOf = new Map(people.map((row) => [row.id, row.locale]))

    await Promise.all(
      written.map((row) => {
        const t = createTranslate(localeOf.get(row.userId))
        return sender.send({
          userId: row.userId,
          title: t('appName'),
          body: t(`notify.${row.kind}`),
          path: '/',
        })
      }),
    )
  } catch (error) {
    const { log, describeError } = await import('#/lib/log')
    log.error('Could not hand a notification to the push sender', {
      error: describeError(error),
    })
  }
}
