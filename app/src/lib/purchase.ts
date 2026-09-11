import { availableOf, wouldBreachLimit } from '#/db/derive'
import { riyalsToHalalas } from './money'

/**
 * UC-04: what a purchase must be before it reaches the ledger, and what the
 * screen can say about it before the merchant commits.
 */

/** A single operation nobody in a grocery is recording by accident. */
export const MAX_PURCHASE_RIYALS = 100_000

/**
 * How long a recorded purchase waits for the customer. Past it the operation
 * is expired rather than pending — worked out from the date on the row, so no
 * job has to run for it to be true.
 */
export const PENDING_MINUTES = 15

export type PurchaseProblem = 'amount' | 'ceiling' | 'limit'

export function describePurchaseProblems(purchase: {
  amountHalalas: number
  balanceHalalas: number
  limitHalalas: number
}): Array<PurchaseProblem> {
  const problems: Array<PurchaseProblem> = []

  if (
    !Number.isInteger(purchase.amountHalalas) ||
    purchase.amountHalalas <= 0
  ) {
    problems.push('amount')
  } else if (purchase.amountHalalas > riyalsToHalalas(MAX_PURCHASE_RIYALS)) {
    problems.push('ceiling')
  } else if (
    wouldBreachLimit(
      purchase.balanceHalalas,
      purchase.limitHalalas,
      purchase.amountHalalas,
    )
  ) {
    // UC-05 refuses the purchase that would breach the limit. Its own ticket
    // adds the merchant's override; here the line is simply held.
    problems.push('limit')
  }

  return problems
}

/** What the account would read as, if this purchase were applied. */
export function projectBalance(input: {
  amountHalalas: number
  balanceHalalas: number
  limitHalalas: number
}) {
  const balanceHalalas = input.balanceHalalas + Math.max(0, input.amountHalalas)

  return {
    balanceHalalas,
    limitHalalas: input.limitHalalas,
    availableHalalas: availableOf(balanceHalalas, input.limitHalalas),
  }
}

/** A pending operation the customer never got to. */
export function hasExpired(
  purchase: { status: string; approvalExpiresAt: Date | null },
  now: Date,
) {
  if (purchase.status !== 'pending' || !purchase.approvalExpiresAt) return false
  return purchase.approvalExpiresAt.getTime() <= now.getTime()
}

export function expiryFrom(recordedAt: Date): Date {
  return new Date(recordedAt.getTime() + PENDING_MINUTES * 60 * 1000)
}
