import { and, desc, eq } from 'drizzle-orm'
import { connections, merchants, transactions } from '../schema'
import { hasExpired } from '#/lib/purchase'
import { wouldBreachLimit } from '../derive'
import { issueApproval, readApproval } from '#/lib/approval.server'
import { getConnectionSummary } from './ledger'
import { announce } from './ledger-events'
import { markActed } from './notifications'
import type { Database } from '../client'
import type { ApprovalProblem } from '#/lib/approval.server'

export type OperationStatus = 'pending' | 'applied' | 'cancelled' | 'failed'

export type PendingOperation = {
  status: OperationStatus
  transactionId: string
  connectionId: string
  merchantId: string
  merchantName: string
  customerUserId: string
  amountHalalas: number
  description: string | null
  dueAt: Date | null
  termsAccepted: boolean
}

/**
 * What the customer is being asked to agree to — or what became of it. An
 * operation that has been answered is still theirs to read: the screen they
 * approved on should say what happened, not that the page is gone.
 */
export async function readOperation(
  db: Database,
  transactionId: string,
  now: Date = new Date(),
): Promise<PendingOperation | null> {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
  const row = rows.at(0)
  if (!row) return null

  const summary = await getConnectionSummary(db, row.connectionId, now)
  if (!summary) return null

  const link = (
    await db
      .select()
      .from(connections)
      .where(eq(connections.id, row.connectionId))
  ).at(0)

  return {
    // A pending operation nobody answered in time reads as called off, which
    // is what it is: the ledger will never take it now.
    status: hasExpired(row, now) ? 'cancelled' : row.status,
    transactionId: row.id,
    connectionId: row.connectionId,
    merchantId: summary.merchantId,
    merchantName: summary.merchantName,
    customerUserId: summary.customerUserId,
    amountHalalas: row.amountHalalas,
    description: row.description,
    dueAt: row.dueAt,
    termsAccepted: Boolean(link?.termsAcceptedAt),
  }
}

/** Only an operation still waiting can be approved or declined. */
export async function readPendingOperation(
  db: Database,
  transactionId: string,
  now: Date = new Date(),
): Promise<PendingOperation | null> {
  const operation = await readOperation(db, transactionId, now)
  return operation?.status === 'pending' ? operation : null
}

/**
 * UC-07: the customer agrees once, before their first operation with a shop,
 * and the ledger records when.
 */
export async function acceptTerms(
  db: Database,
  input: { connectionId: string; customerUserId: string; now?: Date },
) {
  const summary = await getConnectionSummary(db, input.connectionId)
  if (!summary || summary.customerUserId !== input.customerUserId) return false

  await db
    .update(connections)
    .set({ termsAcceptedAt: input.now ?? new Date() })
    .where(eq(connections.id, input.connectionId))
  return true
}

export type ApprovalResult =
  { ok: true; code: string } | { ok: false; problem: 'missing' | 'terms' }

/**
 * Approving is the intent, not the apply. It mints a code the merchant scans;
 * nothing moves on the ledger until they do, which is what makes the network
 * dropping in between harmless.
 */
export async function approveOperation(
  db: Database,
  input: { transactionId: string; customerUserId: string; now?: Date },
): Promise<ApprovalResult> {
  const now = input.now ?? new Date()
  const operation = await readPendingOperation(db, input.transactionId, now)

  if (!operation || operation.customerUserId !== input.customerUserId) {
    return { ok: false, problem: 'missing' }
  }
  if (!operation.termsAccepted) return { ok: false, problem: 'terms' }

  // UC-12: whichever screen they came from, the line about this operation is
  // answered now and cannot be answered again.
  await markActed(db, {
    transactionId: operation.transactionId,
    userId: input.customerUserId,
    now,
  })

  return {
    ok: true,
    code: issueApproval(
      {
        transactionId: operation.transactionId,
        merchantId: operation.merchantId,
      },
      now,
    ),
  }
}

/**
 * Everything waiting on one customer's word, newest first. A lapsed operation
 * is not waiting on anybody, so it is left out.
 */
export async function listAwaitingCustomer(
  db: Database,
  customerUserId: string,
  now: Date = new Date(),
): Promise<Array<PendingOperation>> {
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(connections, eq(connections.id, transactions.connectionId))
    .where(
      and(
        eq(connections.customerUserId, customerUserId),
        eq(transactions.status, 'pending'),
      ),
    )
    .orderBy(desc(transactions.createdAt))

  const operations = await Promise.all(
    rows.map((row) => readPendingOperation(db, row.id, now)),
  )
  return operations.filter((operation) => operation !== null)
}

/** Whose phone is the shop's, so the shop can be told what happened on it. */
async function shopkeeperOf(db: Database, merchantId: string) {
  const rows = await db
    .select({ ownerUserId: merchants.ownerUserId })
    .from(merchants)
    .where(eq(merchants.id, merchantId))
  return rows.at(0)?.ownerUserId ?? null
}

/** The customer says no: the operation is off, and the shop is told. */
export async function declineOperation(
  db: Database,
  input: { transactionId: string; customerUserId: string },
): Promise<boolean> {
  const operation = await readPendingOperation(db, input.transactionId)
  if (!operation || operation.customerUserId !== input.customerUserId) {
    return false
  }

  await db
    .update(transactions)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(transactions.id, operation.transactionId),
        eq(transactions.status, 'pending'),
      ),
    )

  await markActed(db, {
    transactionId: operation.transactionId,
    userId: input.customerUserId,
  })

  // The shop is the one waiting on an answer, so the shop is the one told.
  const shopkeeper = await shopkeeperOf(db, operation.merchantId)
  if (shopkeeper) {
    await announce(db, [
      {
        userId: shopkeeper,
        kind: 'purchase.cancelled',
        subjectId: operation.transactionId,
      },
    ])
  }

  return true
}

export type ApplyResult =
  | { ok: true; transactionId: string; repeated: boolean }
  | {
      ok: false
      problem: ApprovalProblem | 'gone' | 'elsewhere' | 'already' | 'limit'
    }

/**
 * The scan is the apply. It is idempotent on the approval token: the token is
 * written onto the row in the same statement that applies it, and the column
 * is unique, so a repeated or retried scan finds the operation it already
 * applied rather than making a second one. The operation ends up applied
 * exactly once, or not at all.
 */
export async function applyApproval(
  db: Database,
  input: { code: string; merchantId: string; now?: Date },
): Promise<ApplyResult> {
  const now = input.now ?? new Date()
  const check = readApproval(input.code, now)
  if (!check.ok) return { ok: false, problem: check.problem }

  const { approval } = check
  // A code is only good for the shop it was issued to.
  if (approval.merchantId !== input.merchantId) {
    return { ok: false, problem: 'elsewhere' }
  }

  // UC-05: the limit is checked again here, not only when the operation was
  // entered, because another purchase may have landed in between.
  const waiting = (
    await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, approval.transactionId),
          eq(transactions.status, 'pending'),
        ),
      )
  ).at(0)
  if (waiting) {
    const account = await getConnectionSummary(db, waiting.connectionId, now)
    if (
      account &&
      wouldBreachLimit(
        account.balanceHalalas,
        account.limitHalalas,
        waiting.amountHalalas,
      )
    ) {
      return { ok: false, problem: 'limit' }
    }
  }

  const applied = await db
    .update(transactions)
    .set({ status: 'applied', appliedAt: now, approvalToken: input.code })
    .where(
      and(
        eq(transactions.id, approval.transactionId),
        eq(transactions.status, 'pending'),
      ),
    )
    .returning()

  const row = applied.at(0)
  if (row) {
    const summary = await getConnectionSummary(db, row.connectionId, now)
    const shopkeeper = summary
      ? await shopkeeperOf(db, summary.merchantId)
      : null
    if (summary) {
      // Both phones re-fetch: the shop's waiting screen moves on, and the
      // customer's balance is right without them doing anything.
      await announce(db, [
        {
          userId: summary.customerUserId,
          kind: 'purchase.applied',
          subjectId: row.id,
        },
        ...(shopkeeper
          ? [
              {
                userId: shopkeeper,
                kind: 'purchase.applied' as const,
                subjectId: row.id,
              },
            ]
          : []),
      ])
    }
    return { ok: true, transactionId: row.id, repeated: false }
  }

  // Nothing was pending. Either this very code already applied it, which is a
  // retry, or the operation is gone.
  const existing = (
    await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, approval.transactionId))
  ).at(0)

  if (!existing) return { ok: false, problem: 'gone' }
  if (existing.status === 'applied' && existing.approvalToken === input.code) {
    return { ok: true, transactionId: existing.id, repeated: true }
  }
  return {
    ok: false,
    problem: existing.status === 'applied' ? 'already' : 'gone',
  }
}
