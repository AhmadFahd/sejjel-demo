import { and, desc, eq, isNull, or } from 'drizzle-orm'
import {
  connections,
  merchants,
  notifications,
  termChanges,
  users,
} from '../schema'
import { getConnectionSummary, listAllMerchantConnections } from './ledger'
import { announce } from './ledger-events'
import { isBelowBalance } from '#/lib/terms'
import type { Database } from '../client'
import type { ConnectionSummary } from './ledger'

/**
 * UC-13: the shop's default terms, and the overrides that let one customer
 * stand somewhere else. A null override is not a value of its own — it means
 * this customer follows the shop, and keeps following it when the shop moves.
 */

export type ShopTerms = {
  merchantId: string
  name: string
  defaultLimitHalalas: number
  defaultTermDays: number
}

/** A customer left owing more than their new limit allows. */
export type OverLimit = {
  connectionId: string
  customerName: string
  balanceHalalas: number
  limitHalalas: number
}

export type SaveResult = {
  /** Saved, and these customers can buy nothing more until they pay down. */
  overLimit: Array<OverLimit>
  /** How many customers the change actually moved. */
  moved: number
}

export async function readShopTerms(
  db: Database,
  merchantId: string,
): Promise<ShopTerms | null> {
  const rows = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId))
  const row = rows.at(0)
  if (!row) return null

  return {
    merchantId: row.id,
    name: row.name,
    defaultLimitHalalas: row.defaultLimitHalalas,
    defaultTermDays: row.defaultTermDays,
  }
}

/** What the two sides are told, and what the history keeps, after a change. */
async function settle(
  db: Database,
  input: {
    merchantId: string
    changedByUserId: string
    connectionId: string | null
    before: { limitHalalas: number; termDays: number }
    after: { limitHalalas: number; termDays: number }
    /** Everyone whose terms moved: their screens are now out of date. */
    affected: Array<ConnectionSummary>
    /** Those of them whose credit limit is what moved. */
    limitChanged: Array<ConnectionSummary>
    now: Date
  },
): Promise<SaveResult> {
  await db.insert(termChanges).values({
    merchantId: input.merchantId,
    connectionId: input.connectionId,
    changedByUserId: input.changedByUserId,
    limitBeforeHalalas: input.before.limitHalalas,
    limitAfterHalalas: input.after.limitHalalas,
    termBeforeDays: input.before.termDays,
    termAfterDays: input.after.termDays,
    createdAt: input.now,
  })

  if (input.limitChanged.length > 0) {
    // The limit is what the customer's available balance is computed from, so
    // a change to it is told to them rather than left to be noticed.
    await db.insert(notifications).values(
      input.limitChanged.map((row) => ({
        userId: row.customerUserId,
        kind: 'limit_changed' as const,
        connectionId: row.connectionId,
        createdAt: input.now,
      })),
    )
  }

  if (input.affected.length > 0) {
    await announce(
      db,
      input.affected.map((row) => ({
        userId: row.customerUserId,
        kind: 'terms.changed' as const,
        subjectId: row.connectionId,
      })),
    )
  }

  return {
    moved: input.affected.length,
    overLimit: input.limitChanged
      .filter((row) =>
        isBelowBalance(input.after.limitHalalas, row.balanceHalalas),
      )
      .map((row) => ({
        connectionId: row.connectionId,
        customerName: row.customerName,
        balanceHalalas: row.balanceHalalas,
        limitHalalas: input.after.limitHalalas,
      })),
  }
}

/**
 * The shop's defaults. Changing them moves every customer standing on them
 * and leaves the overridden ones exactly where they are, which is the whole
 * point of an override.
 */
export async function saveShopTerms(
  db: Database,
  input: {
    merchantId: string
    changedByUserId: string
    limitHalalas: number
    termDays: number
    now?: Date
  },
): Promise<SaveResult | null> {
  const now = input.now ?? new Date()
  const shop = await readShopTerms(db, input.merchantId)
  if (!shop) return null

  const unchanged =
    shop.defaultLimitHalalas === input.limitHalalas &&
    shop.defaultTermDays === input.termDays
  if (unchanged) return { overLimit: [], moved: 0 }

  const before = await listAllMerchantConnections(db, input.merchantId, now)

  await db
    .update(merchants)
    .set({
      defaultLimitHalalas: input.limitHalalas,
      defaultTermDays: input.termDays,
    })
    .where(eq(merchants.id, input.merchantId))

  // Only the customers who inherit the field that moved are affected; the
  // ones with their own figure did not budge.
  const limitChanged =
    shop.defaultLimitHalalas === input.limitHalalas
      ? []
      : before.filter((row) => row.limitOverrideHalalas === null)
  const termChanged =
    shop.defaultTermDays === input.termDays
      ? []
      : before.filter((row) => row.termOverrideDays === null)
  const affected = [
    ...limitChanged,
    ...termChanged.filter((row) => !limitChanged.includes(row)),
  ]

  return settle(db, {
    merchantId: input.merchantId,
    changedByUserId: input.changedByUserId,
    connectionId: null,
    before: {
      limitHalalas: shop.defaultLimitHalalas,
      termDays: shop.defaultTermDays,
    },
    after: { limitHalalas: input.limitHalalas, termDays: input.termDays },
    affected,
    limitChanged,
    now,
  })
}

/**
 * One customer's overrides. A null clears the field, which puts them back on
 * the shop's default rather than freezing today's default as their own.
 */
export async function saveCustomerTerms(
  db: Database,
  input: {
    connectionId: string
    merchantId: string
    changedByUserId: string
    limitOverrideHalalas: number | null
    termOverrideDays: number | null
    now?: Date
  },
): Promise<SaveResult | null> {
  const now = input.now ?? new Date()
  const before = await getConnectionSummary(db, input.connectionId, now)
  if (!before || before.merchantId !== input.merchantId) return null

  await db
    .update(connections)
    .set({
      limitOverrideHalalas: input.limitOverrideHalalas,
      termOverrideDays: input.termOverrideDays,
    })
    .where(eq(connections.id, input.connectionId))

  const after = await getConnectionSummary(db, input.connectionId, now)
  if (!after) return null

  const moved =
    after.limitHalalas !== before.limitHalalas ||
    after.termDays !== before.termDays
  if (!moved) return { overLimit: [], moved: 0 }

  return settle(db, {
    merchantId: input.merchantId,
    changedByUserId: input.changedByUserId,
    connectionId: input.connectionId,
    before: {
      limitHalalas: before.limitHalalas,
      termDays: before.termDays,
    },
    after: { limitHalalas: after.limitHalalas, termDays: after.termDays },
    affected: [after],
    limitChanged: after.limitHalalas === before.limitHalalas ? [] : [after],
    now,
  })
}

export type TermChange = {
  id: string
  connectionId: string | null
  changedByName: string
  limitBeforeHalalas: number | null
  limitAfterHalalas: number | null
  termBeforeDays: number | null
  termAfterDays: number | null
  createdAt: Date
}

/**
 * What happened to one customer's terms: their own overrides, and the shop
 * changes that moved them. The shop's rows are included because a customer
 * whose limit changed without anybody touching their screen would otherwise
 * have no record of why.
 */
export async function listTermChanges(
  db: Database,
  input: { merchantId: string; connectionId?: string; limit?: number },
): Promise<Array<TermChange>> {
  // A customer's own rows, plus the shop's: a limit that moved because the
  // default moved has to be readable from the customer's screen too.
  const scope = input.connectionId
    ? or(
        eq(termChanges.connectionId, input.connectionId),
        isNull(termChanges.connectionId),
      )
    : undefined

  const rows = await db
    .select({ change: termChanges, changedBy: users })
    .from(termChanges)
    .innerJoin(users, eq(users.id, termChanges.changedByUserId))
    .where(and(eq(termChanges.merchantId, input.merchantId), scope))
    .orderBy(desc(termChanges.createdAt), desc(termChanges.id))
    .limit(input.limit ?? 10)

  return rows.map((row) => ({
    id: row.change.id,
    connectionId: row.change.connectionId,
    changedByName: row.changedBy.name,
    limitBeforeHalalas: row.change.limitBeforeHalalas,
    limitAfterHalalas: row.change.limitAfterHalalas,
    termBeforeDays: row.change.termBeforeDays,
    termAfterDays: row.change.termAfterDays,
    createdAt: row.change.createdAt,
  }))
}
