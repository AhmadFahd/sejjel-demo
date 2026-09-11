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

/** The merchant's side: the scan is what applies the operation. */
export const applyScannedCode = createServerFn({ method: 'POST' })
  .validator((input: unknown): { code: string } => ({
    code: String((input as { code?: unknown }).code ?? ''),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { applyApproval } = await import('#/db/queries/approval')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop) return { applied: false, problem: 'elsewhere' as const }

    const result = await applyApproval(getDatabase(), {
      code: data.code,
      merchantId: shop.id,
    })

    return result.ok
      ? { applied: true, problem: null, transactionId: result.transactionId }
      : { applied: false, problem: result.problem }
  })
