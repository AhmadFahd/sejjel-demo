import { and, eq } from 'drizzle-orm'
import { connections, merchants } from '../schema'
import { readIdentity } from '#/lib/approval.server'
import { announce } from './ledger-events'
import type { Database } from '../client'
import type { ApprovalProblem } from '#/lib/approval.server'

export type ConnectResult =
  | { ok: true; connectionId: string; already: boolean; waiting: boolean }
  | { ok: false; problem: ApprovalProblem | 'self' }

/**
 * UC-08: the merchant scans the customer's card and asks for them. The
 * connection exists as a request until the customer agrees — a shop cannot add
 * somebody to its ledger by pointing a camera at them.
 */
export async function connectByIdentity(
  db: Database,
  input: { code: string; merchantId: string; now?: Date },
): Promise<ConnectResult> {
  const now = input.now ?? new Date()
  const check = readIdentity(input.code, now)
  if (!check.ok) return { ok: false, problem: check.problem }

  const customerUserId = check.identity.customerUserId
  const shop = (
    await db.select().from(merchants).where(eq(merchants.id, input.merchantId))
  ).at(0)
  if (!shop) return { ok: false, problem: 'shape' }

  // A shopkeeper scanning their own card would be lending to themselves.
  if (shop.ownerUserId === customerUserId) return { ok: false, problem: 'self' }

  const existing = (
    await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.merchantId, input.merchantId),
          eq(connections.customerUserId, customerUserId),
        ),
      )
  ).at(0)

  // Scanning somebody the shop already keeps opens their account rather than
  // making a second one. A revoked connection is asked for again.
  if (existing && existing.status !== 'revoked') {
    return {
      ok: true,
      connectionId: existing.id,
      already: true,
      waiting: existing.status === 'pending',
    }
  }

  const [row] = existing
    ? await db
        .update(connections)
        .set({ status: 'pending', termsAcceptedAt: null })
        .where(eq(connections.id, existing.id))
        .returning()
    : await db
        .insert(connections)
        // The limit and the term are the shop's defaults, which is what the
        // null overrides mean: change the shop's, and this moves with it.
        .values({
          merchantId: input.merchantId,
          customerUserId,
          status: 'pending',
        })
        .returning()

  await announce(db, [
    {
      userId: customerUserId,
      kind: 'connection.requested',
      subjectId: row.id,
    },
  ])

  return { ok: true, connectionId: row.id, already: false, waiting: true }
}

export type ConnectionRequest = {
  connectionId: string
  merchantId: string
  merchantName: string
  limitHalalas: number
  termDays: number
}

/** What is waiting on one customer's word, shop by shop. */
export async function listConnectionRequests(
  db: Database,
  customerUserId: string,
): Promise<Array<ConnectionRequest>> {
  const rows = await db
    .select({ connection: connections, merchant: merchants })
    .from(connections)
    .innerJoin(merchants, eq(merchants.id, connections.merchantId))
    .where(
      and(
        eq(connections.customerUserId, customerUserId),
        eq(connections.status, 'pending'),
      ),
    )

  return rows.map((row) => ({
    connectionId: row.connection.id,
    merchantId: row.merchant.id,
    merchantName: row.merchant.name,
    limitHalalas:
      row.connection.limitOverrideHalalas ?? row.merchant.defaultLimitHalalas,
    termDays: row.connection.termOverrideDays ?? row.merchant.defaultTermDays,
  }))
}

/**
 * The customer's answer. Agreeing is also when they accept the shop's terms,
 * since that is the moment they are agreeing to owe it anything.
 */
export async function answerConnectionRequest(
  db: Database,
  input: {
    connectionId: string
    customerUserId: string
    agree: boolean
    now?: Date
  },
): Promise<boolean> {
  const now = input.now ?? new Date()
  const row = (
    await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.id, input.connectionId),
          eq(connections.customerUserId, input.customerUserId),
          eq(connections.status, 'pending'),
        ),
      )
  ).at(0)
  if (!row) return false

  await db
    .update(connections)
    .set(
      input.agree
        ? { status: 'active', termsAcceptedAt: now }
        : // Refusing leaves nothing in the shop's list: a revoked connection
          // is not one of its customers, and the row is what says they asked.
          { status: 'revoked' },
    )
    .where(eq(connections.id, row.id))

  const shop = (
    await db.select().from(merchants).where(eq(merchants.id, row.merchantId))
  ).at(0)
  if (shop) {
    await announce(db, [
      {
        userId: shop.ownerUserId,
        kind: 'connection.accepted',
        subjectId: row.id,
      },
    ])
  }

  return true
}
