import { createServerFn } from '@tanstack/react-start'
import type { PaymentMethod } from '#/providers/types'

const METHODS: Array<PaymentMethod> = ['apple_pay', 'mada', 'card']

/** UC-10: paying is the customer's, so who is paying comes from the session. */
export const startPayment = createServerFn({ method: 'POST' })
  .validator(
    (
      input: unknown,
    ): {
      connectionId: string
      amountHalalas: number
      method: PaymentMethod
      requestId: string
    } => {
      const raw = input as Record<string, unknown>
      const method = String(raw.method ?? '')
      return {
        connectionId: String(raw.connectionId ?? ''),
        amountHalalas: Number(raw.amountHalalas),
        method: METHODS.includes(method as PaymentMethod)
          ? (method as PaymentMethod)
          : 'card',
        requestId: String(raw.requestId ?? ''),
      }
    },
  )
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { getProviders } = await import('#/providers/registry')
    const { startSettlement } = await import('#/db/queries/settle')
    const user = await requireSignedInUser()

    const result = await startSettlement(
      getDatabase(),
      getProviders().payments,
      {
        connectionId: data.connectionId,
        customerUserId: user.id,
        amountHalalas: data.amountHalalas,
        method: data.method,
        requestId: data.requestId,
      },
    )

    return result.ok
      ? { problems: [], transactionId: result.transactionId }
      : { problems: result.problems }
  })

/**
 * What the gateway says. A real one calls back and this is what the callback
 * would run; the fake is asked here, from the page that started it.
 */
export const confirmPayment = createServerFn({ method: 'POST' })
  .validator((input: unknown): { transactionId: string } => ({
    transactionId: String(
      (input as { transactionId?: unknown }).transactionId ?? '',
    ),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { getProviders } = await import('#/providers/registry')
    const { confirmSettlement } = await import('#/db/queries/settle')
    const user = await requireSignedInUser()

    return {
      state: await confirmSettlement(getDatabase(), getProviders().payments, {
        transactionId: data.transactionId,
        customerUserId: user.id,
      }),
    }
  })
