import { createServerFn } from '@tanstack/react-start'

/**
 * UC-08: the code on the customer's own card, minted for them alone, with
 * whatever is waiting on their word. A shop scanning the card is answered on
 * this screen, which is the one they are holding up.
 */
export const issueMyCode = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { listConnectionRequests } = await import('#/db/queries/connect')
    const { issueIdentity } = await import('#/lib/approval.server')
    const user = await requireSignedInUser()

    return {
      code: issueIdentity(user.id),
      requests: await listConnectionRequests(getDatabase(), user.id),
    }
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
