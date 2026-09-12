import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { Database } from '../client'
import { connections, merchants, transactions, users } from '../schema'
import { availableOf, limitOf, statusOf, termOf } from '../derive'
import { daysOverdue, dueStateOf, startOfRiyadhDay } from '#/lib/payday'
import type { DueState } from '#/lib/payday'
import type { LedgerStatus } from '../derive'

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
  /** UC-13: null where this customer stands on the shop's default. */
  limitOverrideHalalas: number | null
  termOverrideDays: number | null
  defaultLimitHalalas: number
  defaultTermDays: number
  /** UC-06: when this customer took the shop's terms, or null. */
  termsAcceptedAt: Date | null
  dueAt: Date | null
  dueState: DueState
  daysOverdue: number
  status: LedgerStatus
  purchases: number
  payments: number
}

function toSummary(
  now: Date,
  row: {
    connection: typeof connections.$inferSelect
    merchant: typeof merchants.$inferSelect
    customer: typeof users.$inferSelect
    balance: number
    purchases: number
    payments: number
    dueAt: number | null
  },
): ConnectionSummary {
  const source = {
    defaultLimitHalalas: row.merchant.defaultLimitHalalas,
    defaultTermDays: row.merchant.defaultTermDays,
    limitOverrideHalalas: row.connection.limitOverrideHalalas,
    termOverrideDays: row.connection.termOverrideDays,
  }
  const limitHalalas = limitOf(source)
  const balanceHalalas = Number(row.balance)
  const dueAt = row.dueAt === null ? null : new Date(Number(row.dueAt) * 1000)

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
    limitOverrideHalalas: row.connection.limitOverrideHalalas,
    termOverrideDays: row.connection.termOverrideDays,
    defaultLimitHalalas: row.merchant.defaultLimitHalalas,
    defaultTermDays: row.merchant.defaultTermDays,
    termsAcceptedAt: row.connection.termsAcceptedAt,
    dueAt,
    dueState: dueStateOf(dueAt, now),
    daysOverdue: dueAt ? daysOverdue(dueAt, now) : 0,
    status: statusOf({ balanceHalalas, limitHalalas, dueAt, now }),
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

export type Page = { limit?: number; offset?: number }

const DEFAULT_PAGE_SIZE = 25

/**
 * UC-02: every customer of one shop, with what they owe, a page at a time.
 * Ordered by name and then by id, so a name shared by two customers cannot
 * make a row appear on two pages or on none.
 */
export async function listMerchantConnections(
  db: Database,
  merchantId: string,
  now: Date = new Date(),
  page: Page = {},
) {
  /**
   * Which customers this page is, decided before anything is added up. A
   * limit on the summary itself is applied after the grouping, so a page of
   * twenty-five used to aggregate every customer of the shop and the whole
   * of their transaction history first, and then throw all but a page away.
   * This picks the page from the connections alone — the rows the shop's own
   * index covers — and the sums are worked out for those.
   */
  const thisPage = db
    .select({ id: connections.id })
    .from(connections)
    .innerJoin(users, eq(users.id, connections.customerUserId))
    .where(
      and(
        eq(connections.merchantId, merchantId),
        eq(connections.status, 'active'),
      ),
    )
    .orderBy(users.name, connections.id)
    .limit(page.limit ?? DEFAULT_PAGE_SIZE)
    .offset(page.offset ?? 0)

  const rows = await summaryQuery(db)
    .where(inArray(connections.id, thisPage))
    .orderBy(users.name, connections.id)
  return rows.map((row) => toSummary(now, row))
}

/**
 * Every active customer of one shop, unpaged. For work that has to touch all
 * of them at once — changing the shop's default terms moves everybody who
 * stands on them (UC-13) — where a page would quietly leave some behind.
 */
export async function listAllMerchantConnections(
  db: Database,
  merchantId: string,
  now: Date = new Date(),
) {
  const rows = await summaryQuery(db)
    .where(
      and(
        eq(connections.merchantId, merchantId),
        eq(connections.status, 'active'),
      ),
    )
    .orderBy(users.name, connections.id)
  return rows.map((row) => toSummary(now, row))
}

/**
 * The figures at the top of a dashboard, summed in SQL over every connection
 * on that side of the ledger — not over the page the screen happens to be
 * showing, so paging cannot change what is owed.
 */
export type LedgerTotals = {
  connections: number
  outstandingHalalas: number
  overdueHalalas: number
  purchases: number
  payments: number
}

async function totalsOver(
  db: Database,
  where: SQL | undefined,
  now: Date,
): Promise<LedgerTotals> {
  const perConnection = db
    .select({
      balance: balanceExpression.as('balance'),
      dueAt: dueExpression.as('due_at'),
      purchases: appliedCount('purchase').as('purchases'),
      payments: appliedCount('payment').as('payments'),
    })
    .from(connections)
    .leftJoin(transactions, eq(transactions.connectionId, connections.id))
    .where(where)
    .groupBy(connections.id)
    .as('per_connection')

  // Overdue draws the same line the pill does: a due day earlier than today's,
  // with the day boundary Riyadh's rather than the server's.
  const today = Math.floor(startOfRiyadhDay(now).getTime() / 1000)
  const owed = sql`case when ${perConnection.balance} > 0
    then ${perConnection.balance} else 0 end`

  const rows = await db
    .select({
      connections: sql<number>`count(*)`,
      outstanding: sql<number>`coalesce(sum(${owed}), 0)`,
      overdue: sql<number>`coalesce(sum(case
        when ${perConnection.dueAt} is not null and ${perConnection.dueAt} < ${today}
        then ${owed} else 0 end), 0)`,
      purchases: sql<number>`coalesce(sum(${perConnection.purchases}), 0)`,
      payments: sql<number>`coalesce(sum(${perConnection.payments}), 0)`,
    })
    .from(perConnection)

  const row = rows.at(0)
  return {
    connections: Number(row?.connections ?? 0),
    outstandingHalalas: Number(row?.outstanding ?? 0),
    overdueHalalas: Number(row?.overdue ?? 0),
    purchases: Number(row?.purchases ?? 0),
    payments: Number(row?.payments ?? 0),
  }
}

/** UC-02: what the shop is owed, across every customer of it. */
export function getMerchantTotals(
  db: Database,
  merchantId: string,
  now: Date = new Date(),
) {
  return totalsOver(
    db,
    and(
      eq(connections.merchantId, merchantId),
      eq(connections.status, 'active'),
    ),
    now,
  )
}

/** UC-09: what one customer owes, across every shop they owe it to. */
export function getCustomerTotals(
  db: Database,
  userId: string,
  now: Date = new Date(),
) {
  return totalsOver(
    db,
    and(
      eq(connections.customerUserId, userId),
      eq(connections.status, 'active'),
    ),
    now,
  )
}

/** UC-09: every shop one customer owes. */
export async function listCustomerConnections(
  db: Database,
  userId: string,
  now: Date = new Date(),
) {
  const rows = await summaryQuery(db)
    .where(
      and(
        eq(connections.customerUserId, userId),
        eq(connections.status, 'active'),
      ),
    )
    .orderBy(merchants.name)
  return rows.map((row) => toSummary(now, row))
}

export async function getConnectionSummary(
  db: Database,
  connectionId: string,
  now: Date = new Date(),
) {
  const rows = await summaryQuery(db).where(eq(connections.id, connectionId))
  const row = rows.at(0)
  return row ? toSummary(now, row) : null
}

/** UC-03: the transaction list, newest first, a page at a time. */
export async function listTransactions(
  db: Database,
  connectionId: string,
  page: Page = {},
) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.connectionId, connectionId))
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(page.limit ?? 50)
    .offset(page.offset ?? 0)
}

/**
 * What became of one operation of this shop's, by the id the screen already
 * holds. Scoped to the shop rather than read by id alone: a shop may ask
 * about its own operations and no others.
 */
export async function readShopTransaction(
  db: Database,
  input: { transactionId: string; merchantId: string },
) {
  const rows = await db
    .select({ id: transactions.id, status: transactions.status })
    .from(transactions)
    .innerJoin(connections, eq(connections.id, transactions.connectionId))
    .where(
      and(
        eq(transactions.id, input.transactionId),
        eq(connections.merchantId, input.merchantId),
      ),
    )
    .limit(1)
  return rows.at(0) ?? null
}
