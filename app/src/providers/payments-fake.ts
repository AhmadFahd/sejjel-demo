import { randomUUID } from 'node:crypto'
import type { Payment, PaymentGateway } from './types'

/**
 * Confirms when told to, and fails when told to, so both paths are reachable
 * without an account anywhere. Payments live in memory: restarting the server
 * forgets them, which is fine for something that never handles real money.
 */
export function createFakePaymentGateway(): PaymentGateway & {
  failNext: (reason?: string) => void
} {
  const payments = new Map<string, Payment>()
  const byIdempotencyKey = new Map<string, string>()
  let nextFailure: string | null = null

  return {
    name: 'fake',

    failNext(reason = 'The card was declined') {
      nextFailure = reason
    },

    async start({ amountHalalas, method, idempotencyKey }) {
      const existingId = byIdempotencyKey.get(idempotencyKey)
      if (existingId) return payments.get(existingId)!

      const payment: Payment = {
        id: randomUUID(),
        state: 'pending',
        amountHalalas,
        method,
        receiptReference: null,
        failureReason: null,
      }
      payments.set(payment.id, payment)
      byIdempotencyKey.set(idempotencyKey, payment.id)
      return payment
    },

    async get(paymentId) {
      return payments.get(paymentId) ?? null
    },

    async confirm(paymentId) {
      const payment = payments.get(paymentId)
      if (!payment) throw new Error(`No payment ${paymentId}`)
      if (payment.state !== 'pending') return payment

      if (nextFailure) {
        payment.state = 'failed'
        payment.failureReason = nextFailure
        nextFailure = null
      } else {
        payment.state = 'paid'
        payment.receiptReference = `FAKE-${payment.id.slice(0, 8).toUpperCase()}`
      }
      return payment
    },
  }
}
