import { and, eq } from 'drizzle-orm'
import { connections, merchants } from '../schema'
import { limitOf, termOf } from '../derive'
import { announce } from './ledger-events'
import type { Database } from '../client'

/**
 * UC-16: the other direction of UC-08. There, the shop points a camera at a
 * customer and has to wait for them to agree. Here the customer scans the
 * code on the counter, so the agreeing is the scan and the press that
 * follows it — the shop's standing offer is the code it printed.
 */

export type Shop = {
  merchantId: string
  name: string
  limitHalalas: number
  termDays: number
  /** Where this person already stands with the shop, if anywhere. */
  connectionId: string | null
  joined: boolean
}

export async function readShopFor(
  db: Database,
  input: { merchantId: string; userId: string | null },
): Promise<Shop | null> {
  const shop = (
    await db.select().from(merchants).where(eq(merchants.id, input.merchantId))
  ).at(0)
  if (!shop) return null

  const existing = input.userId
    ? (
        await db
          .select()
          .from(connections)
          .where(
            and(
              eq(connections.merchantId, shop.id),
              eq(connections.customerUserId, input.userId),
            ),
          )
      ).at(0)
    : undefined

  const terms = {
    defaultLimitHalalas: shop.defaultLimitHalalas,
    defaultTermDays: shop.defaultTermDays,
    limitOverrideHalalas: existing?.limitOverrideHalalas ?? null,
    termOverrideDays: existing?.termOverrideDays ?? null,
  }

  return {
    merchantId: shop.id,
    name: shop.name,
    limitHalalas: limitOf(terms),
    termDays: termOf(terms),
    connectionId: existing && existing.status === 'active' ? existing.id : null,
    joined: existing?.status === 'active',
  }
}

export type JoinResult =
  | { ok: true; connectionId: string; already: boolean }
  | { ok: false; problem: 'missing' | 'self' }

/**
 * The customer agreeing to the shop's terms is what makes the connection, and
 * it is active at once: unlike a shop asking for somebody, there is nobody
 * left to wait for.
 */
export async function joinShop(
  db: Database,
  input: { merchantId: string; userId: string; now?: Date },
): Promise<JoinResult> {
  const now = input.now ?? new Date()
  const shop = (
    await db.select().from(merchants).where(eq(merchants.id, input.merchantId))
  ).at(0)
  if (!shop) return { ok: false, problem: 'missing' }

  // A shopkeeper joining their own shop would be lending to themselves.
  if (shop.ownerUserId === input.userId) return { ok: false, problem: 'self' }

  const existing = (
    await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.merchantId, shop.id),
          eq(connections.customerUserId, input.userId),
        ),
      )
  ).at(0)

  if (existing?.status === 'active') {
    return { ok: true, connectionId: existing.id, already: true }
  }

  // A connection the shop asked for and this person is now agreeing to from
  // the other side is the same connection, answered.
  const [row] = existing
    ? await db
        .update(connections)
        .set({ status: 'active', termsAcceptedAt: now })
        .where(eq(connections.id, existing.id))
        .returning()
    : await db
        .insert(connections)
        .values({
          merchantId: shop.id,
          customerUserId: input.userId,
          status: 'active',
          termsAcceptedAt: now,
        })
        .returning()

  // The shop finds out it has a customer without anybody refreshing.
  await announce(db, [
    {
      userId: shop.ownerUserId,
      kind: 'connection.accepted',
      subjectId: row.id,
    },
  ])

  return { ok: true, connectionId: row.id, already: false }
}
