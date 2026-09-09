import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '#/auth/server'

/** Better Auth's own endpoints: send the code, verify it, read or end a session. */
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => getAuth().handler(request),
      POST: ({ request }) => getAuth().handler(request),
    },
  },
})
