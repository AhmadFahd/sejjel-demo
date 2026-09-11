import { createServerFn } from '@tanstack/react-start'

export type NewOperation = {
  connectionId: string
  amountHalalas: number
  description: string
  requestId: string
}

/**
 * UC-04: recording an operation is the merchant's, so the shop comes from the
 * session rather than from the form. The connection is checked against it,
 * which is what keeps one shop from writing on another's ledger.
 */
export const recordOperation = createServerFn({ method: 'POST' })
  .validator((input: unknown): NewOperation => {
    const raw = input as Partial<Record<keyof NewOperation, unknown>>
    return {
      connectionId: String(raw.connectionId ?? ''),
      amountHalalas: Number(raw.amountHalalas),
      description: String(raw.description ?? ''),
      requestId: String(raw.requestId ?? ''),
    }
  })
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { recordPendingPurchase } = await import('#/db/queries/purchases')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop) return { problems: ['connection' as const] }

    const result = await recordPendingPurchase(getDatabase(), {
      connectionId: data.connectionId,
      merchantId: shop.id,
      amountHalalas: data.amountHalalas,
      description: data.description,
      requestId: data.requestId,
    })

    return result.ok
      ? { problems: [], transactionId: result.transactionId }
      : { problems: result.problems }
  })

export const cancelOperation = createServerFn({ method: 'POST' })
  .validator((input: unknown): { transactionId: string } => {
    const raw = input as { transactionId?: unknown }
    return { transactionId: String(raw.transactionId ?? '') }
  })
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { cancelPendingPurchase } = await import('#/db/queries/purchases')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop) return { cancelled: false }

    return {
      cancelled: await cancelPendingPurchase(getDatabase(), {
        transactionId: data.transactionId,
        merchantId: shop.id,
      }),
    }
  })
