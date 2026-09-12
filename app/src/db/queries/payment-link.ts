import { randomBytes, randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { merchants, paymentLinks, transactions } from '../schema'
import { getConnectionSummary } from './ledger'
import { confirmSettlement, startSettlement } from './settle'
import { linkExpiresAt, linkState } from '#/lib/payment-link'
import type { LinkState } from '#/lib/payment-link'
import type { Database } from '../client'
import type { PaymentGateway, PaymentMethod } from '#/providers/types'

/**
 * UC-17: the link, the page it opens, and the payment it takes. Nobody here
 * is signed in — the token is the whole of the caller's claim — so every
 * function reads what it needs off the link rather than off a session.
 */

/** 18 bytes: a token nobody arrives at by trying tokens. */
function mintToken() {
  return randomBytes(18).toString('base64url')
}

export type IssuedLink = {
  token: string
  amountHalalas: number
  expiresAt: Date
}

export type IssueResult =
  | { ok: true; link: IssuedLink }
  | { ok: false; problem: 'connection' | 'nothing' }

/**
 * The merchant's press. One live link per customer at a time: pressing again
 * for the same balance hands back the link already sent, and a balance that
 * has moved ends the old link before making a new one, so there is never a
 * second live page asking for a figure that is no longer true.
 */
export async function issuePaymentLink(
  db: Database,
  input: { connectionId: string; merchantUserId: string; now?: Date },
): Promise<IssueResult> {
  const now = input.now ?? new Date()

  const summary = await getConnectionSummary(db, input.connectionId, now)
  if (!summary) return { ok: false, problem: 'connection' }

  const shop = (
    await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, summary.merchantId))
  ).at(0)
  // Another shop's customer is not theirs to bill.
  if (!shop || shop.ownerUserId !== input.merchantUserId) {
    return { ok: false, problem: 'connection' }
  }

  if (summary.balanceHalalas <= 0) return { ok: false, problem: 'nothing' }

  const live = (
    await db
      .select()
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.connectionId, input.connectionId),
          isNull(paymentLinks.consumedAt),
        ),
      )
      .orderBy(desc(paymentLinks.createdAt))
  ).filter((row) => row.expiresAt.getTime() > now.getTime())

  const same = live.find((row) => row.amountHalalas === summary.balanceHalalas)
  if (same) {
    return {
      ok: true,
      link: {
        token: same.token,
        amountHalalas: same.amountHalalas,
        expiresAt: same.expiresAt,
      },
    }
  }

  if (live.length > 0) {
    await db
      .update(paymentLinks)
      .set({ expiresAt: now })
      .where(
        inArray(
          paymentLinks.id,
          live.map((row) => row.id),
        ),
      )
  }

  const [row] = await db
    .insert(paymentLinks)
    .values({
      connectionId: input.connectionId,
      token: mintToken(),
      amountHalalas: summary.balanceHalalas,
      expiresAt: linkExpiresAt(now),
      createdAt: now,
    })
    .returning()

  return {
    ok: true,
    link: {
      token: row.token,
      amountHalalas: row.amountHalalas,
      expiresAt: row.expiresAt,
    },
  }
}

/**
 * What the page may show. The shop, the amount and the due date and nothing
 * else: whoever holds the link was sent it, but a link forwarded on must not
 * hand a stranger the customer's name, their number or the rest of what they
 * owe.
 */
export type PaymentLinkView = {
  token: string
  shopName: string
  amountHalalas: number
  dueAt: Date | null
  expiresAt: Date
  state: LinkState
  /** Once it is paid, what the payer can quote back. */
  receiptReference: string | null
  paidAt: Date | null
}

export async function readPaymentLink(
  db: Database,
  token: string,
  now: Date = new Date(),
): Promise<PaymentLinkView | null> {
  const row = (
    await db.select().from(paymentLinks).where(eq(paymentLinks.token, token))
  ).at(0)
  if (!row) return null

  const summary = await getConnectionSummary(db, row.connectionId, now)
  if (!summary) return null

  const state = linkState(row, summary.balanceHalalas, now)

  const paid = row.transactionId
    ? (
        await db
          .select()
          .from(transactions)
          .where(eq(transactions.id, row.transactionId))
      ).at(0)
    : undefined

  return {
    token: row.token,
    shopName: summary.merchantName,
    amountHalalas: row.amountHalalas,
    dueAt: summary.dueAt,
    expiresAt: row.expiresAt,
    state,
    receiptReference: paid?.receiptReference ?? null,
    paidAt: paid?.appliedAt ?? null,
  }
}

export type LinkPaymentResult =
  | { ok: true; receiptReference: string | null }
  | { ok: false; problem: LinkState | 'missing' | 'refused' }

/**
 * A payment from the page. It goes through the same two steps an in-app
 * settlement does, so what lands on the ledger is a payment like any other
 * and the shop is told about it by the same announcement.
 *
 * The link is claimed before the gateway is asked, and the claim is what
 * makes it single-use: two people opening the same page at once means one
 * payment, because the second claim finds the row already taken. A refusal
 * puts the claim back, so a declined card can be tried again.
 */
export async function payWithLink(
  db: Database,
  gateway: PaymentGateway,
  input: { token: string; method: PaymentMethod; now?: Date },
): Promise<LinkPaymentResult> {
  const now = input.now ?? new Date()

  const row = (
    await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.token, input.token))
  ).at(0)
  if (!row) return { ok: false, problem: 'missing' }

  const summary = await getConnectionSummary(db, row.connectionId, now)
  if (!summary) return { ok: false, problem: 'missing' }

  const state = linkState(row, summary.balanceHalalas, now)
  if (state !== 'payable') return { ok: false, problem: state }

  const claimed = await db
    .update(paymentLinks)
    .set({ consumedAt: now })
    .where(and(eq(paymentLinks.id, row.id), isNull(paymentLinks.consumedAt)))
    .returning()
  if (claimed.length === 0) return { ok: false, problem: 'paid' }

  const release = async () => {
    await db
      .update(paymentLinks)
      .set({ consumedAt: null })
      .where(eq(paymentLinks.id, row.id))
  }

  // A fresh key per attempt: the claim above already prevents a second
  // payment, and reusing one would have a retry find the refused row instead
  // of asking the gateway again.
  const started = await startSettlement(db, gateway, {
    connectionId: row.connectionId,
    customerUserId: summary.customerUserId,
    amountHalalas: row.amountHalalas,
    method: input.method,
    requestId: `link:${row.id}:${randomUUID()}`,
    now,
  })
  if (!started.ok) {
    await release()
    return {
      ok: false,
      problem: started.problems.includes('more') ? 'changed' : 'refused',
    }
  }

  const settled = await confirmSettlement(db, gateway, {
    transactionId: started.transactionId,
    customerUserId: summary.customerUserId,
    now,
  })

  if (settled?.status !== 'applied') {
    await release()
    return { ok: false, problem: 'refused' }
  }

  await db
    .update(paymentLinks)
    .set({ transactionId: started.transactionId })
    .where(eq(paymentLinks.id, row.id))

  return { ok: true, receiptReference: settled.receiptReference }
}
