import { and, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { connections, merchants, transactions, users } from '../schema'
import { availableOf, limitOf, termOf } from '../derive'

/**
 * Balances are derived in SQL from applied rows, the same rule `balanceOf`
 * states in TypeScript. Nothing stores a balance, so nothing can disagree
 * with the transactions behind it.
 */
const balanceExpression = sql<number>`coalesce(sum(
  case
    when ${transactions.status} <> 'applied' then 0
    when ${transactions.kind} = 'purchase' then ${transactions.amountHalalas}
    else -${transactions.amountHalalas}
  end
), 0)`

const appliedCount = (kind: 'purchase' | 'payment') =>
  sql<number>`coalesce(sum(
    case when ${transactions.status} = 'applied' and ${transactions.kind} = ${kind}
    then 1 else 0 end
  ), 0)`

/** The furthest due date among applied purchases: when the account falls due. */
const dueExpression = sql<number | null>`max(
  case when ${transactions.status} = 'applied' and ${transactions.kind} = 'purchase'
  then ${transactions.dueAt} else null end
)`

export type ConnectionSummary = {
  connectionId: string
  merchantId: string
  merchantName: string
  customerUserId: string
  customerName: string
  customerMobile: string
  balanceHalalas: number
  limitHalalas: number
  availableHalalas: number
  termDays: number
  dueAt: Date | null
  purchases: number
  payments: number
}

function toSummary(row: {
  connection: typeof connections.$inferSelect
  merchant: typeof merchants.$inferSelect
  customer: typeof users.$inferSelect
  balance: number
  purchases: number
  payments: number
  dueAt: number | null
}): ConnectionSummary {
  const source = {
    defaultLimitHalalas: row.merchant.defaultLimitHalalas,
    defaultTermDays: row.merchant.defaultTermDays,
    limitOverrideHalalas: row.connection.limitOverrideHalalas,
    termOverrideDays: row.connection.termOverrideDays,
  }
  const limitHalalas = limitOf(source)
  const balanceHalalas = Number(row.balance)

  return {
    connectionId: row.connection.id,
    merchantId: row.merchant.id,
    merchantName: row.merchant.name,
    customerUserId: row.customer.id,
    customerName: row.customer.name,
    customerMobile: row.customer.phoneNumber,
    balanceHalalas,
    limitHalalas,
    availableHalalas: availableOf(balanceHalalas, limitHalalas),
    termDays: termOf(source),
    dueAt: row.dueAt === null ? null : new Date(Number(row.dueAt) * 1000),
    purchases: Number(row.purchases),
    payments: Number(row.payments),
  }
}

const summarySelect = {
  connection: connections,
  merchant: merchants,
  customer: users,
  balance: balanceExpression,
  purchases: appliedCount('purchase'),
  payments: appliedCount('payment'),
  dueAt: dueExpression,
}

function summaryQuery(db: Database) {
  return db
    .select(summarySelect)
    .from(connections)
    .innerJoin(merchants, eq(merchants.id, connections.merchantId))
    .innerJoin(users, eq(users.id, connections.customerUserId))
    .leftJoin(transactions, eq(transactions.connectionId, connections.id))
    .groupBy(connections.id)
}

/** UC-02: every customer of one shop, with what they owe. */
export async function listMerchantConnections(
  db: Database,
  merchantId: string,
) {
  const rows = await summaryQuery(db)
    .where(
      and(
        eq(connections.merchantId, merchantId),
        eq(connections.status, 'active'),
      ),
    )
    .orderBy(users.name)
  return rows.map(toSummary)
}

/** UC-09: every shop one customer owes. */
export async function listCustomerConnections(db: Database, userId: string) {
  const rows = await summaryQuery(db)
    .where(
      and(
        eq(connections.customerUserId, userId),
        eq(connections.status, 'active'),
      ),
    )
    .orderBy(merchants.name)
  return rows.map(toSummary)
}

export async function getConnectionSummary(db: Database, connectionId: string) {
  const rows = await summaryQuery(db).where(eq(connections.id, connectionId))
  const row = rows.at(0)
  return row ? toSummary(row) : null
}

/** UC-03: the transaction list, newest first, a page at a time. */
export async function listTransactions(
  db: Database,
  connectionId: string,
  page: { limit?: number; offset?: number } = {},
) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.connectionId, connectionId))
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(page.limit ?? 50)
    .offset(page.offset ?? 0)
}
