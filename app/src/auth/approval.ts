import { createServerFn } from '@tanstack/react-start'

/**
 * UC-07: the customer's side of the handshake. Which operation is being
 * approved comes from the form; who is approving comes from the session, and
 * the two are checked against each other on the server.
 */
export const acceptShopTerms = createServerFn({ method: 'POST' })
  .validator((input: unknown): { connectionId: string } => ({
    connectionId: String(
      (input as { connectionId?: unknown }).connectionId ?? '',
    ),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { acceptTerms } = await import('#/db/queries/approval')
    const user = await requireSignedInUser()

    return {
      accepted: await acceptTerms(getDatabase(), {
        connectionId: data.connectionId,
        customerUserId: user.id,
      }),
    }
  })

export const approveOperationFn = createServerFn({ method: 'POST' })
  .validator((input: unknown): { transactionId: string } => ({
    transactionId: String(
      (input as { transactionId?: unknown }).transactionId ?? '',
    ),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { approveOperation } = await import('#/db/queries/approval')
    const user = await requireSignedInUser()

    const result = await approveOperation(getDatabase(), {
      transactionId: data.transactionId,
      customerUserId: user.id,
    })

    return result.ok
      ? { code: result.code, problem: null }
      : { code: null, problem: result.problem }
  })

export const declineOperationFn = createServerFn({ method: 'POST' })
  .validator((input: unknown): { transactionId: string } => ({
    transactionId: String(
      (input as { transactionId?: unknown }).transactionId ?? '',
    ),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { declineOperation } = await import('#/db/queries/approval')
    const user = await requireSignedInUser()

    return {
      declined: await declineOperation(getDatabase(), {
        transactionId: data.transactionId,
        customerUserId: user.id,
      }),
    }
  })

/**
 * The merchant's side. One camera reads two kinds of code: an approval, which
 * applies an operation, and a customer's own card, which asks to keep them.
 * Which one it is, is in the code, so the shopkeeper does not have to choose a
 * mode before pointing the phone.
 */
export const applyScannedCode = createServerFn({ method: 'POST' })
  .validator((input: unknown): { code: string } => ({
    code: String((input as { code?: unknown }).code ?? ''),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { applyApproval } = await import('#/db/queries/approval')
    const { connectByIdentity } = await import('#/db/queries/connect')
    const { readCode } = await import('#/lib/approval.server')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop)
      return { outcome: 'refused' as const, problem: 'elsewhere' as const }

    const db = getDatabase()
    const read = readCode(data.code)

    if (read.ok && read.payload.kind === 'identity') {
      const connected = await connectByIdentity(db, {
        code: data.code,
        merchantId: shop.id,
      })
      return connected.ok
        ? {
            outcome: connected.waiting
              ? ('asked' as const)
              : ('connected' as const),
            problem: null,
            connectionId: connected.connectionId,
          }
        : { outcome: 'refused' as const, problem: connected.problem }
    }

    const result = await applyApproval(db, {
      code: data.code,
      merchantId: shop.id,
    })

    return result.ok
      ? {
          outcome: 'applied' as const,
          problem: null,
          transactionId: result.transactionId,
        }
      : { outcome: 'refused' as const, problem: result.problem }
  })
