import { redirect } from '@tanstack/react-router'
import { loadSignedInUser } from './session'
import { canSee, homeFor } from './roles'
import type { SignedInUser } from './session'
import type { Side } from './roles'

/**
 * Every screen below the front door runs this. A person who is not signed in
 * goes to the sign-in screen; a person on the other side of the ledger goes to
 * their own side rather than to a screen that would show them nothing.
 */
export async function requireSide(side: Side): Promise<SignedInUser> {
  const user = await loadSignedInUser()
  if (!user) throw redirect({ to: '/sign-in' })
  if (!canSee(user.roles, side)) throw redirect({ to: homeFor(user.roles) })
  return user
}

export async function requireSignedIn(): Promise<SignedInUser> {
  const user = await loadSignedInUser()
  if (!user) throw redirect({ to: '/sign-in' })
  return user
}
