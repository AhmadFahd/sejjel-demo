/**
 * UC-10: what a customer may settle, and how much of it. The fee a shop pays
 * on a settlement is the shop's, per the business-model review, so nothing
 * here takes anything off what the customer is paying.
 */
export type SettlementProblem = 'amount' | 'nothing' | 'more'

export function describeSettlementProblems(input: {
  amountHalalas: number
  balanceHalalas: number
}): Array<SettlementProblem> {
  if (input.balanceHalalas <= 0) return ['nothing']
  if (!Number.isInteger(input.amountHalalas) || input.amountHalalas <= 0) {
    return ['amount']
  }
  // Paying more than is owed would leave the shop holding the difference.
  if (input.amountHalalas > input.balanceHalalas) return ['more']
  return []
}
