import { availableOf, wouldBreachLimit } from '#/db/derive'
import { riyalsToHalalas } from './money'
import type { DueState } from './payday'

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

export type PurchaseProblem = 'amount' | 'ceiling' | 'limit' | 'overdue'

export type PurchaseCheck = {
  problems: Array<PurchaseProblem>
  /** UC-05: how much over the limit this purchase would put the account. */
  overByHalalas: number
  availableHalalas: number
  /** UC-06: what is already late, and for how long. */
  overdueHalalas: number
  daysOverdue: number
}

/**
 * UC-05 and UC-06: what stops a purchase, and what only warns about it.
 *
 * The limit is a line the shop set when it was not standing at the counter,
 * so it holds: a purchase past it is refused. Being late is not a line but a
 * fact the merchant should know before lending more, so it is a warning they
 * can go past deliberately — and the going past is recorded.
 */
export function assessPurchase(purchase: {
  amountHalalas: number
  balanceHalalas: number
  limitHalalas: number
  dueState?: DueState
  daysOverdue?: number
  /** The merchant saw the warning and went on anyway. */
  acknowledgedOverdue?: boolean
}): PurchaseCheck {
  const problems: Array<PurchaseProblem> = []
  const amount = purchase.amountHalalas
  const wouldBe = purchase.balanceHalalas + Math.max(0, amount)
  const overByHalalas = Math.max(0, wouldBe - purchase.limitHalalas)
  // A date that has gone on an account that owes nothing is not lateness:
  // خالد paid up in July and is not to be warned about in September.
  const overdue = purchase.dueState === 'overdue' && purchase.balanceHalalas > 0

  if (!Number.isInteger(amount) || amount <= 0) {
    problems.push('amount')
  } else if (amount > riyalsToHalalas(MAX_PURCHASE_RIYALS)) {
    problems.push('ceiling')
  } else if (
    wouldBreachLimit(purchase.balanceHalalas, purchase.limitHalalas, amount)
  ) {
    problems.push('limit')
  } else if (overdue && !purchase.acknowledgedOverdue) {
    problems.push('overdue')
  }

  return {
    problems,
    overByHalalas,
    availableHalalas: availableOf(
      purchase.balanceHalalas,
      purchase.limitHalalas,
    ),
    overdueHalalas: overdue ? purchase.balanceHalalas : 0,
    daysOverdue: overdue ? (purchase.daysOverdue ?? 0) : 0,
  }
}

/** The problems alone, for a caller that only needs to know whether to stop. */
export function describePurchaseProblems(purchase: {
  amountHalalas: number
  balanceHalalas: number
  limitHalalas: number
}): Array<PurchaseProblem> {
  return assessPurchase(purchase).problems
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
