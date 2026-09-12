import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { connections, merchants, notifications, transactions } from '../schema'
import type { Database } from '../client'
import type { EventKind } from './events'
import type { DueState } from '#/lib/payday'

/**
 * UC-12: the bell. A notification is a row addressed to a person, so it
 * survives a closed tab and reads the same on their other phone.
 */

export type NotificationKind = (typeof notifications.$inferSelect)['kind']

/**
 * What each event puts in the person's list, and which of the two subjects
 * the event's id is. Derived from the event rather than passed beside it, so
 * an event and the notification it produces cannot drift apart.
 */
const FROM_EVENT: Partial<
  Record<
    EventKind,
    { kind: NotificationKind; subject: 'transaction' | 'connection' }
  >
> = {
  'purchase.recorded': {
    kind: 'purchase_awaiting_approval',
    subject: 'transaction',
  },
  'purchase.applied': { kind: 'purchase_applied', subject: 'transaction' },
  'payment.received': { kind: 'payment_received', subject: 'transaction' },
  'connection.requested': {
    kind: 'connection_requested',
    subject: 'connection',
  },
  'terms.changed': { kind: 'limit_changed', subject: 'connection' },
}

/**
 * A cancelled purchase and an accepted connection move screens but are not
 * worth a line in anybody's list, so they have no entry above.
 */
export function notificationFor(
  entry: { userId: string; kind: EventKind; subjectId?: string },
  now: Date,
): typeof notifications.$inferInsert | null {
  const shape = FROM_EVENT[entry.kind]
  if (!shape) return null

  return {
    userId: entry.userId,
    kind: shape.kind,
    connectionId: shape.subject === 'connection' ? entry.subjectId : null,
    transactionId: shape.subject === 'transaction' ? entry.subjectId : null,
    createdAt: now,
  }
}

export type Notification = {
  id: string
  kind: NotificationKind
  connectionId: string | null
  transactionId: string | null
  readAt: Date | null
  actedAt: Date | null
  createdAt: Date
  /** What the row is about, for a line that reads without another query. */
  merchantName: string | null
  amountHalalas: number | null
  /** UC-12: an operation still waiting can be answered from the list. */
  awaitingApproval: boolean
}

const PAGE_SIZE = 30

export async function listNotifications(
  db: Database,
  userId: string,
  limit = PAGE_SIZE,
): Promise<Array<Notification>> {
  const rows = await db
    .select({
      notification: notifications,
      transaction: transactions,
      merchant: merchants,
    })
    .from(notifications)
    .leftJoin(transactions, eq(transactions.id, notifications.transactionId))
    .leftJoin(
      connections,
      eq(
        connections.id,
        sql`coalesce(${notifications.connectionId}, ${transactions.connectionId})`,
      ),
    )
    .leftJoin(merchants, eq(merchants.id, connections.merchantId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit)

  return rows.map((row) => ({
    id: row.notification.id,
    kind: row.notification.kind,
    connectionId: row.notification.connectionId,
    transactionId: row.notification.transactionId,
    readAt: row.notification.readAt,
    actedAt: row.notification.actedAt,
    createdAt: row.notification.createdAt,
    merchantName: row.merchant?.name ?? null,
    amountHalalas: row.transaction?.amountHalalas ?? null,
    awaitingApproval:
      row.notification.kind === 'purchase_awaiting_approval' &&
      row.transaction?.status === 'pending' &&
      row.notification.actedAt === null,
  }))
}

export async function countUnread(db: Database, userId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
  return Number(rows.at(0)?.count ?? 0)
}

/** Opening the list is what clears the count; a row stays in it either way. */
export async function markAllRead(
  db: Database,
  userId: string,
  now: Date = new Date(),
) {
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
}

/** UC-12: acted on once. A second press finds the row already answered. */
export async function markActed(
  db: Database,
  input: { transactionId: string; userId: string; now?: Date },
) {
  await db
    .update(notifications)
    .set({ actedAt: input.now ?? new Date() })
    .where(
      and(
        eq(notifications.userId, input.userId),
        eq(notifications.transactionId, input.transactionId),
        isNull(notifications.actedAt),
      ),
    )
}

/**
 * A due date approaching, and one gone past. Nothing happens to make these
 * true — time passes — so somebody has to look for them; the dedupe key is
 * what keeps one look per date from becoming one row per look.
 *
 * #78: the looking is `sweepDueDates` below, on a clock. It used to be the two
 * dashboards, which meant reading the slowest screen in the app wrote rows,
 * fired an event and invalidated the screen that had just been waited for —
 * and a customer who never opened the app was never told at all.
 */
export async function noticeDueDates(
  db: Database,
  input: {
    userId: string
    summaries: Array<{
      connectionId: string
      balanceHalalas: number
      dueState: DueState
      dueAt: Date | null
    }>
    now?: Date
  },
) {
  const now = input.now ?? new Date()

  const rows = input.summaries
    .filter(
      (summary) =>
        summary.balanceHalalas > 0 &&
        (summary.dueState === 'due_soon' || summary.dueState === 'overdue'),
    )
    .map((summary) => ({
      userId: input.userId,
      kind:
        summary.dueState === 'overdue'
          ? ('overdue' as const)
          : ('due_soon' as const),
      connectionId: summary.connectionId,
      dedupeKey: [
        input.userId,
        summary.connectionId,
        summary.dueState,
        summary.dueAt?.toISOString() ?? 'none',
      ].join(':'),
      createdAt: now,
    }))

  if (rows.length === 0) return 0

  const written = await db
    .insert(notifications)
    .values(rows)
    .onConflictDoNothing()
    .returning()

  // The screen that noticed is not the one carrying the bell, so the bell is
  // woken the way everything else in this app is woken.
  if (written.length > 0) {
    const { announce } = await import('./ledger-events')
    await announce(db, [{ userId: input.userId, kind: 'notification.added' }])
  }

  return written.length
}

/**
 * #78: the clock's own round of the ledger. Every account with something owed
 * on it and a date on that, and a line for each of the two people it concerns
 * — the customer who owes it and the shop that is waiting. One announcement
 * per person however many of their accounts came round at once.
 *
 * Safe to run as often as anybody likes: the dedupe key means a date is one
 * row per person whoever notices it and however many times.
 */
export async function sweepDueDates(db: Database, now: Date = new Date()) {
  const { listOwedConnections } = await import('./ledger')
  const owed = await listOwedConnections(db, now)

  const byUser = new Map<string, Array<(typeof owed)[number]>>()
  for (const summary of owed) {
    for (const userId of [summary.customerUserId, summary.ownerUserId]) {
      const mine = byUser.get(userId)
      if (mine) mine.push(summary)
      else byUser.set(userId, [summary])
    }
  }

  let written = 0
  for (const [userId, summaries] of byUser) {
    written += await noticeDueDates(db, { userId, summaries, now })
  }
  return written
}
