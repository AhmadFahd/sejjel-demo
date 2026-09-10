import { dueStateOf } from '#/lib/payday'

/**
 * The rules a balance follows, with no database in sight, so they can be read
 * and tested on their own. Everything here works in halalas.
 */

export type LedgerEntry = {
  kind: 'purchase' | 'payment'
  status: 'pending' | 'applied' | 'cancelled' | 'failed'
  amountHalalas: number
}

export type LimitSource = {
  defaultLimitHalalas: number
  defaultTermDays: number
  limitOverrideHalalas: number | null
  termOverrideDays: number | null
}

/** Only applied rows move a balance. A pending purchase owes nothing yet. */
export function balanceOf(entries: Array<LedgerEntry>): number {
  return entries.reduce((total, entry) => {
    if (entry.status !== 'applied') return total
    return entry.kind === 'purchase'
      ? total + entry.amountHalalas
      : total - entry.amountHalalas
  }, 0)
}

export function limitOf(source: LimitSource): number {
  return source.limitOverrideHalalas ?? source.defaultLimitHalalas
}

export function termOf(source: LimitSource): number {
  return source.termOverrideDays ?? source.defaultTermDays
}

/** What is left to spend. Never negative, however far past the limit a balance is. */
export function availableOf(balanceHalalas: number, limitHalalas: number) {
  return Math.max(0, limitHalalas - balanceHalalas)
}

/** UC-05: the purchase that would breach the limit is the one that is refused. */
export function wouldBreachLimit(
  balanceHalalas: number,
  limitHalalas: number,
  purchaseHalalas: number,
) {
  return balanceHalalas + purchaseHalalas > limitHalalas
}

export type LedgerStatus =
  'settled' | 'overdue' | 'at_limit' | 'due_soon' | 'open'

/**
 * The prototype's pills, plus the amber one it drew but never computed:
 * مسدد, تجاوز الموعد, بلغ الحد, يستحق قريبًا, حساب قائم.
 *
 * Overdue outranks the limit, as it does in `statusOf` there. The limit
 * outranks the warning, because reaching it stops the next purchase and a
 * date approaching does not.
 */
export function statusOf(input: {
  balanceHalalas: number
  limitHalalas: number
  dueAt: Date | null
  now: Date
}): LedgerStatus {
  if (input.balanceHalalas <= 0) return 'settled'

  const due = dueStateOf(input.dueAt, input.now)
  if (due === 'overdue') return 'overdue'
  if (input.balanceHalalas >= input.limitHalalas) return 'at_limit'
  if (due === 'due_soon') return 'due_soon'
  return 'open'
}

/** UC-15: the operations counter under the balance. */
export function countOperations(entries: Array<LedgerEntry>) {
  const applied = entries.filter((entry) => entry.status === 'applied')
  const purchases = applied.filter((e) => e.kind === 'purchase').length
  const payments = applied.filter((e) => e.kind === 'payment').length
  return { total: purchases + payments, purchases, payments }
}
