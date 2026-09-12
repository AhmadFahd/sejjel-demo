import { and, asc, eq, gt } from 'drizzle-orm'
import { events } from '../schema'
import type { Database } from '../client'

/**
 * #14: an event names what changed and carries no state. The client re-fetches
 * on hearing one, so a replayed or dropped event can never leave a wrong
 * number on a screen — the worst it can do is cost a query.
 */
export type EventKind =
  | 'purchase.recorded'
  | 'purchase.applied'
  | 'purchase.cancelled'
  | 'payment.received'
  | 'connection.requested'
  | 'connection.accepted'
  | 'terms.changed'
  /** UC-12: a line arrived in somebody's list, or the list was opened and
   * they were all read. Either way the bell re-counts. */
  | 'notification.added'
  | 'notification.read'

export type LedgerEvent = {
  id: number
  kind: EventKind
  subjectId: string | null
}

/** Rows, not a broadcast: a phone that slept through one can still catch up. */
export async function recordEvents(
  db: Database,
  entries: Array<{ userId: string; kind: EventKind; subjectId?: string }>,
) {
  if (entries.length === 0) return []

  return db
    .insert(events)
    .values(
      entries.map((entry) => ({
        userId: entry.userId,
        kind: entry.kind,
        subjectId: entry.subjectId ?? null,
      })),
    )
    .returning()
}

/**
 * What one user missed. `afterId` is their Last-Event-ID, so a reconnecting
 * client asks for exactly the events it has not seen.
 */
export async function eventsSince(
  db: Database,
  userId: string,
  afterId: number,
  limit = 100,
): Promise<Array<LedgerEvent>> {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), gt(events.id, afterId)))
    .orderBy(asc(events.id))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as EventKind,
    subjectId: row.subjectId,
  }))
}

/** Where a stream starts when the client has never heard anything. */
export async function latestEventId(
  db: Database,
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.userId, userId))
    .orderBy(asc(events.id))
  return rows.at(-1)?.id ?? 0
}
