import { createServerFn } from '@tanstack/react-start'
import type { ConnectionRequest } from '#/db/queries/connect'

/**
 * UC-08: the code on the customer's own card, minted for them alone. Signing
 * a payload and nothing else — there is no query behind it — but the secret
 * is the server's, so it is still a round trip.
 *
 * #81: this is asked for by the screen rather than by its loader. A stream
 * event reloads the route whenever a shop asks for this person, which is
 * exactly what happens while the card is being scanned, and a reload that
 * minted a new code would change the QR under the camera reading it.
 */
export const mintMyCode = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { requireSignedInUser } = await import('./session.server')
    const { issueIdentity } = await import('#/lib/approval.server')
    const user = await requireSignedInUser()

    return { code: issueIdentity(user.id) }
  },
)

/**
 * UC-08: the shops asking to keep this person. The card is one of the screens
 * that carries their answer, because a shop that has just scanned the card is
 * asking on the screen its reader is holding up.
 */
export const myConnectionRequests = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<ConnectionRequest>> => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { listConnectionRequests } = await import('#/db/queries/connect')
    const user = await requireSignedInUser()

    return listConnectionRequests(getDatabase(), user.id)
  },
)

export const answerRequest = createServerFn({ method: 'POST' })
  .validator((input: unknown): { connectionId: string; agree: boolean } => {
    const raw = input as { connectionId?: unknown; agree?: unknown }
    return {
      connectionId: String(raw.connectionId ?? ''),
      agree: Boolean(raw.agree),
    }
  })
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { answerConnectionRequest } = await import('#/db/queries/connect')
    const user = await requireSignedInUser()

    return {
      answered: await answerConnectionRequest(getDatabase(), {
        connectionId: data.connectionId,
        customerUserId: user.id,
        agree: data.agree,
      }),
    }
  })
