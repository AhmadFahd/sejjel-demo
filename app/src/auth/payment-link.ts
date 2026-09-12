import { createServerFn } from '@tanstack/react-start'
import type { PaymentMethod } from '#/providers/types'

const METHODS: Array<PaymentMethod> = ['apple_pay', 'mada', 'card']

/**
 * UC-17: the two ends of a payment link. Making one is the shop's, so it
 * takes who is asking from the session; paying one is nobody's in particular,
 * so it takes the token and nothing else — that is the point of the link.
 */

export const sharePaymentLinkFn = createServerFn({ method: 'POST' })
  .validator((input: unknown): { connectionId: string } => ({
    connectionId: String(
      (input as { connectionId?: unknown }).connectionId ?? '',
    ),
  }))
  .handler(
    async ({
      data,
    }): Promise<{
      token: string | null
      amountHalalas: number
      expiresAt: Date | null
      problem: string | null
    }> => {
      const { requireSignedInUser } = await import('./session.server')
      const { getDatabase } = await import('#/db/client')
      const { issuePaymentLink } = await import('#/db/queries/payment-link')
      const user = await requireSignedInUser()

      const result = await issuePaymentLink(getDatabase(), {
        connectionId: data.connectionId,
        merchantUserId: user.id,
      })

      return result.ok
        ? {
            token: result.link.token,
            amountHalalas: result.link.amountHalalas,
            expiresAt: result.link.expiresAt,
            problem: null,
          }
        : {
            token: null,
            amountHalalas: 0,
            expiresAt: null,
            problem: result.problem,
          }
    },
  )

export const payLinkFn = createServerFn({ method: 'POST' })
  .validator((input: unknown): { token: string; method: PaymentMethod } => {
    const raw = input as Record<string, unknown>
    const method = String(raw.method ?? '')
    return {
      token: String(raw.token ?? ''),
      method: METHODS.includes(method as PaymentMethod)
        ? (method as PaymentMethod)
        : 'card',
    }
  })
  .handler(async ({ data }) => {
    const { getDatabase } = await import('#/db/client')
    const { getProviders } = await import('#/providers/registry')
    const { payWithLink } = await import('#/db/queries/payment-link')

    const result = await payWithLink(getDatabase(), getProviders().payments, {
      token: data.token,
      method: data.method,
    })

    return result.ok
      ? { receiptReference: result.receiptReference, problem: null }
      : { receiptReference: null, problem: result.problem }
  })
