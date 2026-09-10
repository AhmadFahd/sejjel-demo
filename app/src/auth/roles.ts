/**
 * A person is a merchant because they own a shop, and a customer because a
 * shop has connected them. Nobody picks a role: the ledger already knows, and
 * the same person can be both — a shopkeeper who also owes the baker.
 */
export type Roles = {
  /** The shop this person keeps, if they keep one. */
  merchant: { id: string; name: string } | null
  /** Whether any shop has connected them. */
  customer: boolean
}

export type Side = 'merchant' | 'customer'

export const NO_ROLES: Roles = { merchant: null, customer: false }

export function sidesOf(roles: Roles): Array<Side> {
  const sides: Array<Side> = []
  if (roles.merchant) sides.push('merchant')
  if (roles.customer) sides.push('customer')
  return sides
}

/**
 * Where a person lands after signing in. A shopkeeper opens on the shop: it is
 * the side they use at the counter all day. Someone with neither goes to the
 * screen that explains what to do about it.
 */
export function homeFor(roles: Roles): '/merchant' | '/customer' | '/welcome' {
  if (roles.merchant) return '/merchant'
  if (roles.customer) return '/customer'
  return '/welcome'
}

export function canSee(roles: Roles, side: Side) {
  return side === 'merchant' ? roles.merchant !== null : roles.customer
}
