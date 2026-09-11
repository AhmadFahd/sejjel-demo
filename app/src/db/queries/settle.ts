import { and, eq } from 'drizzle-orm'
import { merchants, transactions } from '../schema'
import { describeSettlementProblems } from '#/lib/settlement'
import { getConnectionSummary } from './ledger'
import { announce } from './ledger-events'
import type { Database } from '../client'
import type { SettlementProblem } from '#/lib/settlement'
import type { PaymentGateway, PaymentMethod } from '#/providers/types'

export type StartResult =
  | { ok: true; transactionId: string; repeated: boolean }
  | { ok: false; problems: Array<SettlementProblem | 'connection'> }

/**
 * The button press starts a payment; it does not move the ledger. The row is
 * written pending, carrying the gateway's payment id, and only a confirmation
 * turns it into money that has moved.
 */
export async function startSettlement(
  db: Database,
  gateway: PaymentGateway,
  input: {
    connectionId: string
    customerUserId: string
    amountHalalas: number
    method: PaymentMethod
    requestId: string
    now?: Date
  },
): Promise<StartResult> {
  const now = input.now ?? new Date()

  const already = (
    await db
      .select()
      .from(transactions)
      .where(eq(transactions.requestId, input.requestId))
  ).at(0)
  if (already) {
    return { ok: true, transactionId: already.id, repeated: true }
  }

  const summary = await getConnectionSummary(db, input.connectionId, now)
  if (!summary || summary.customerUserId !== input.customerUserId) {
    return { ok: false, problems: ['connection'] }
  }

  const problems = describeSettlementProblems({
    amountHalalas: input.amountHalalas,
    balanceHalalas: summary.balanceHalalas,
  })
  if (problems.length > 0) return { ok: false, problems }

  // The same key the row carries, so a retry finds one payment at the gateway
  // as well as one row here.
  const payment = await gateway.start({
    amountHalalas: input.amountHalalas,
    method: input.method,
    idempotencyKey: input.requestId,
  })

  const [row] = await db
    .insert(transactions)
    .values({
      connectionId: input.connectionId,
      kind: 'payment',
      status: 'pending',
      amountHalalas: input.amountHalalas,
      requestId: input.requestId,
      paymentId: payment.id,
      paymentMethod: input.method,
      createdAt: now,
    })
    .returning()

  return { ok: true, transactionId: row.id, repeated: false }
}

export type SettlementState = {
  transactionId: string
  status: 'pending' | 'applied' | 'failed' | 'cancelled'
  amountHalalas: number
  receiptReference: string | null
  failureReason: string | null
}

/**
 * What the gateway says, written down. A real gateway calls back and this is
 * what its callback would run; the fake is asked directly. Either way the
 * ledger moves on `paid` and on nothing else, and asking twice says the same
 * thing rather than settling twice.
 */
export async function confirmSettlement(
  db: Database,
  gateway: PaymentGateway,
  input: { transactionId: string; customerUserId: string; now?: Date },
): Promise<SettlementState | null> {
  const now = input.now ?? new Date()
  const row = (
    await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, input.transactionId),
          eq(transactions.kind, 'payment'),
        ),
      )
  ).at(0)
  if (!row?.paymentId) return null

  const summary = await getConnectionSummary(db, row.connectionId, now)
  if (!summary || summary.customerUserId !== input.customerUserId) return null

  // Already answered: say the same thing again rather than asking the gateway
  // to confirm a payment that is settled.
  if (row.status !== 'pending') {
    return {
      transactionId: row.id,
      status: row.status,
      amountHalalas: row.amountHalalas,
      receiptReference: row.receiptReference,
      failureReason: row.failureReason,
    }
  }

  const payment = await gateway.confirm(row.paymentId)
  if (payment.state === 'pending') {
    return {
      transactionId: row.id,
      status: 'pending',
      amountHalalas: row.amountHalalas,
      receiptReference: null,
      failureReason: null,
    }
  }

  const paid = payment.state === 'paid'
  await db
    .update(transactions)
    .set({
      status: paid ? 'applied' : 'failed',
      appliedAt: paid ? now : null,
      receiptReference: payment.receiptReference,
      failureReason: payment.failureReason,
    })
    .where(eq(transactions.id, row.id))

  if (paid) {
    const shop = (
      await db
        .select()
        .from(merchants)
        .where(eq(merchants.id, summary.merchantId))
    ).at(0)

    // The shop is told money arrived; the customer's own screens re-fetch.
    await announce(db, [
      {
        userId: summary.customerUserId,
        kind: 'payment.received',
        subjectId: row.id,
      },
      ...(shop
        ? [
            {
              userId: shop.ownerUserId,
              kind: 'payment.received' as const,
              subjectId: row.id,
            },
          ]
        : []),
    ])
  }

  return {
    transactionId: row.id,
    status: paid ? 'applied' : 'failed',
    amountHalalas: row.amountHalalas,
    receiptReference: payment.receiptReference,
    failureReason: payment.failureReason,
  }
}
