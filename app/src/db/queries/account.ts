import { getConnectionSummary, listTransactions } from './ledger'
import type { Database } from '../client'

/** How many operations one screen of a history holds. */
export const HISTORY_PAGE_SIZE = 25

/**
 * One connection with a page of its history, which is what both account
 * screens are: the merchant's view of a customer and the customer's view of a
 * shop read the same rows, so the two sides cannot disagree about them.
 *
 * Whether the account may be seen is left to the caller, which knows which
 * side is asking.
 */
export async function readAccountPage(
  db: Database,
  connectionId: string,
  page: number,
  now: Date = new Date(),
) {
  const summary = await getConnectionSummary(db, connectionId, now)
  if (!summary) return null

  // One row more than the page is asked for: whether it came back is the
  // answer to whether there is a next page, without counting the history.
  const rows = await listTransactions(db, connectionId, {
    limit: HISTORY_PAGE_SIZE + 1,
    offset: (page - 1) * HISTORY_PAGE_SIZE,
  })

  return {
    summary,
    transactions: rows.slice(0, HISTORY_PAGE_SIZE),
    hasMore: rows.length > HISTORY_PAGE_SIZE,
  }
}
