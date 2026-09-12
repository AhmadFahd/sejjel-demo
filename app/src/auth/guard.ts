import { redirect } from '@tanstack/react-router'
import { loadSignedInUser } from './session'
import type { SignedInUser } from './session'

/**
 * For a screen that stands outside both sides of the ledger and so has no
 * layout above it to have asked already. The screens inside a side take the
 * person from their layout's context instead; see `auth/enter.ts`.
 */
export async function requireSignedIn(): Promise<SignedInUser> {
  const user = await loadSignedInUser()
  if (!user) throw redirect({ to: '/sign-in' })
  return user
}
