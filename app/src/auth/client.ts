import { createAuthClient } from 'better-auth/react'
import { phoneNumberClient } from 'better-auth/client/plugins'

/** Talks to the endpoints mounted at /api/auth. */
export const authClient = createAuthClient({
  plugins: [phoneNumberClient()],
})
