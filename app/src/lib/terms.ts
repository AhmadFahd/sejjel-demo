/**
 * UC-13: what a shop may set as its terms, and what changing them does to the
 * customers standing under them. No database in sight, so the rules can be
 * read and tested on their own.
 */

export const MAX_LIMIT_RIYALS = 100_000
export const MIN_TERM_DAYS = 1
export const MAX_TERM_DAYS = 90

export type TermsProblem = 'limit' | 'term'

export type Terms = { limitRiyals: number; termDays: number }

function limitIsSound(riyals: number) {
  return Number.isInteger(riyals) && riyals > 0 && riyals <= MAX_LIMIT_RIYALS
}

function termIsSound(days: number) {
  return (
    Number.isInteger(days) && days >= MIN_TERM_DAYS && days <= MAX_TERM_DAYS
  )
}

/** The shop's defaults: both are required, because every customer inherits them. */
export function describeTermsProblems(terms: Terms): Array<TermsProblem> {
  const problems: Array<TermsProblem> = []
  if (!limitIsSound(terms.limitRiyals)) problems.push('limit')
  if (!termIsSound(terms.termDays)) problems.push('term')
  return problems
}

/**
 * One customer's overrides, where null means the shop's default applies. A
 * cleared field is not an unsound one, so only the set fields are checked.
 */
export function describeOverrideProblems(overrides: {
  limitRiyals: number | null
  termDays: number | null
}): Array<TermsProblem> {
  const problems: Array<TermsProblem> = []
  if (overrides.limitRiyals !== null && !limitIsSound(overrides.limitRiyals)) {
    problems.push('limit')
  }
  if (overrides.termDays !== null && !termIsSound(overrides.termDays)) {
    problems.push('term')
  }
  return problems
}

/**
 * A limit under what is already owed is allowed: the shop is entitled to
 * decide it lent too much. What it cannot do is erase the debt, so the
 * balance stays and the account stops taking new purchases until it drops.
 */
export function isBelowBalance(limitHalalas: number, balanceHalalas: number) {
  return balanceHalalas > limitHalalas
}
