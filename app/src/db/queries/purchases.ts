import { and, eq } from 'drizzle-orm'
import { transactions } from '../schema'
import { dueDateFor } from '#/lib/payday'
import { assessPurchase, expiryFrom } from '#/lib/purchase'
import { getConnectionSummary } from './ledger'
import { announce } from './ledger-events'
import type { Database } from '../client'
import type { PurchaseProblem } from '#/lib/purchase'

export type RecordResult =
  | { ok: true; transactionId: string; repeated: boolean }
  | {
      ok: false
      problems: Array<PurchaseProblem | 'connection'>
      /** What the screen needs to say why: UC-05's figures and UC-06's. */
      overByHalalas?: number
      availableHalalas?: number
      overdueHalalas?: number
      daysOverdue?: number
    }

/**
 * UC-04: a purchase lands pending, because the customer has not agreed to it
 * yet. UC-07 is what moves it to applied.
 *
 * The merchant's request id is what makes a retry safe: a second submit
 * carrying the one the screen already used finds the first purchase and
 * changes nothing, rather than putting the amount on the ledger twice.
 */
export async function recordPendingPurchase(
  db: Database,
  input: {
    connectionId: string
    merchantId: string
    amountHalalas: number
    description?: string
    requestId: string
    /** UC-06: the merchant saw the overdue warning and went on. */
    acknowledgedOverdue?: boolean
    /** UC-11: the invoice behind it, if the shopkeeper attached one. */
    invoiceId?: string | null
    now?: Date
  },
): Promise<RecordResult> {
  const now = input.now ?? new Date()

  const existing = await db
    .select()
    .from(transactions)
    .where(eq(transactions.requestId, input.requestId))
  const repeat = existing.at(0)
  if (repeat) return { ok: true, transactionId: repeat.id, repeated: true }

  const summary = await getConnectionSummary(db, input.connectionId, now)
  if (!summary || summary.merchantId !== input.merchantId) {
    return { ok: false, problems: ['connection'] }
  }

  const check = assessPurchase({
    amountHalalas: input.amountHalalas,
    balanceHalalas: summary.balanceHalalas,
    limitHalalas: summary.limitHalalas,
    dueState: summary.dueState,
    daysOverdue: summary.daysOverdue,
    acknowledgedOverdue: input.acknowledgedOverdue,
  })
  if (check.problems.length > 0) {
    return {
      ok: false,
      problems: check.problems,
      overByHalalas: check.overByHalalas,
      availableHalalas: check.availableHalalas,
      overdueHalalas: check.overdueHalalas,
      daysOverdue: check.daysOverdue,
    }
  }

  const [row] = await db
    .insert(transactions)
    .values({
      connectionId: input.connectionId,
      kind: 'purchase',
      status: 'pending',
      amountHalalas: input.amountHalalas,
      description: input.description?.trim() || null,
      invoiceId: input.invoiceId ?? null,
      requestId: input.requestId,
      // The term and the due date are settled now, from the terms in force
      // now, so a later change to the shop's term cannot move this date.
      termDaysSnapshot: summary.termDays,
      dueAt: dueDateFor(now, summary.termDays),
      approvalExpiresAt: expiryFrom(now),
      // UC-06: who was warned and went on is visible on the operation itself.
      overdueAcknowledged: Boolean(input.acknowledgedOverdue),
      createdAt: now,
    })
    .returning()

  // The customer's phone is what this is waiting on, so it is the one told.
  await announce(db, [
    {
      userId: summary.customerUserId,
      kind: 'purchase.recorded',
      subjectId: row.id,
    },
  ])

  return { ok: true, transactionId: row.id, repeated: false }
}

/**
 * The merchant can call off an operation the customer has not answered. Only
 * a pending one: an applied purchase is a debt, and undoing it is a payment,
 * not a cancellation.
 */
export async function cancelPendingPurchase(
  db: Database,
  input: { transactionId: string; merchantId: string },
): Promise<boolean> {
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, input.transactionId),
        eq(transactions.status, 'pending'),
      ),
    )
  const row = rows.at(0)
  if (!row) return false

  // The operation has to belong to this shop, which the connection says.
  const summary = await getConnectionSummary(db, row.connectionId)
  if (!summary || summary.merchantId !== input.merchantId) return false

  await db
    .update(transactions)
    .set({ status: 'cancelled' })
    .where(eq(transactions.id, row.id))

  await announce(db, [
    {
      userId: summary.customerUserId,
      kind: 'purchase.cancelled',
      subjectId: row.id,
    },
  ])

  return true
}
