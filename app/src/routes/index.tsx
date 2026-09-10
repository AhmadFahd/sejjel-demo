import { createFileRoute, redirect } from '@tanstack/react-router'
import { loadSignedInUser } from '#/auth/session'
import { homeFor } from '#/auth/roles'

/**
 * The front door decides nothing itself: it sends a person to the side of the
 * ledger they are on, and to the sign-in screen if they are on neither.
 */
export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await loadSignedInUser()
    throw redirect({ to: user ? homeFor(user.roles) : '/sign-in' })
  },
})
