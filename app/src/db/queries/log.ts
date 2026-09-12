import { and, desc, eq, gte, like, lt, or, sql } from 'drizzle-orm'
import { connections, merchants, transactions, users } from '../schema'
import { startOfRiyadhDay } from '#/lib/payday'
import type { SQL } from 'drizzle-orm'
import type { Database } from '../client'

/**
 * Every operation in one shop, across all its customers. The searching and
 * the paging are both the database's work: a shop with a year of operations
 * behind it should cost the same to open as one with a week.
 */

export type LogEntry = {
  transactionId: string
  connectionId: string
  customerName: string
  customerMobile: string
  kind: 'purchase' | 'payment'
  status: 'pending' | 'applied' | 'cancelled' | 'failed'
  amountHalalas: number
  description: string | null
  invoiceId: string | null
  createdAt: Date
}

export type LogFilter = {
  merchantId: string
  /** A name or a mobile number, matched as it is typed. */
  search?: string
  kind?: 'purchase' | 'payment'
  /** Riyadh days, inclusive at both ends. */
  from?: Date
  to?: Date
  page?: number
}

export const LOG_PAGE_SIZE = 25

export async function listShopOperations(
  db: Database,
  filter: LogFilter,
): Promise<{ entries: Array<LogEntry>; hasMore: boolean }> {
  const page = Math.max(1, filter.page ?? 1)
  const where: Array<SQL | undefined> = [
    eq(connections.merchantId, filter.merchantId),
  ]

  const needle = filter.search?.trim().toLowerCase()
  if (needle) {
    // The number is matched with its spaces taken out, so a mobile typed as
    // it is written on a card still finds the person.
    const bare = needle.replace(/\s/g, '')
    where.push(
      or(
        like(sql`lower(${users.name})`, `%${needle}%`),
        like(users.phoneNumber, `%${bare}%`),
      ),
    )
  }

  if (filter.kind) where.push(eq(transactions.kind, filter.kind))
  if (filter.from)
    where.push(gte(transactions.createdAt, startOfRiyadhDay(filter.from)))
  if (filter.to) {
    // Inclusive: everything before the start of the day after it.
    const after = new Date(startOfRiyadhDay(filter.to).getTime() + 86_400_000)
    where.push(lt(transactions.createdAt, after))
  }

  // One row more than the page, which is how the next page is known to exist
  // without counting everything behind it.
  const rows = await db
    .select({
      transaction: transactions,
      customer: users,
      connection: connections,
    })
    .from(transactions)
    .innerJoin(connections, eq(connections.id, transactions.connectionId))
    .innerJoin(users, eq(users.id, connections.customerUserId))
    .where(and(...where))
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(LOG_PAGE_SIZE + 1)
    .offset((page - 1) * LOG_PAGE_SIZE)

  return {
    hasMore: rows.length > LOG_PAGE_SIZE,
    entries: rows.slice(0, LOG_PAGE_SIZE).map((row) => ({
      transactionId: row.transaction.id,
      connectionId: row.connection.id,
      customerName: row.customer.name,
      customerMobile: row.customer.phoneNumber,
      kind: row.transaction.kind,
      status: row.transaction.status,
      amountHalalas: row.transaction.amountHalalas,
      description: row.transaction.description,
      invoiceId: row.transaction.invoiceId,
      createdAt: row.transaction.createdAt,
    })),
  }
}

/** Whether this shop has any operation at all, which is a different emptiness. */
export async function shopHasOperations(db: Database, merchantId: string) {
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(connections, eq(connections.id, transactions.connectionId))
    .innerJoin(merchants, eq(merchants.id, connections.merchantId))
    .where(eq(merchants.id, merchantId))
    .limit(1)
  return rows.length > 0
}
