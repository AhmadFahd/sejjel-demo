/**
 * What the app needs from the outside world, stated narrowly enough that a
 * real provider is one new file. Nothing outside this directory knows whether
 * an SMS was really sent or a card was really charged.
 */

export type PaymentMethod = 'apple_pay' | 'mada' | 'card'

export type PaymentState = 'pending' | 'paid' | 'failed'

export type Payment = {
  id: string
  state: PaymentState
  amountHalalas: number
  method: PaymentMethod
  /** What the customer can quote back when something goes wrong. */
  receiptReference: string | null
  failureReason: string | null
}

export interface OtpSender {
  readonly name: string
  send: (input: { phoneNumber: string; code: string }) => Promise<void>
}

export interface PaymentGateway {
  readonly name: string
  start: (input: {
    amountHalalas: number
    method: PaymentMethod
    /** Ours, so a retried request settles once. */
    idempotencyKey: string
  }) => Promise<Payment>
  get: (paymentId: string) => Promise<Payment | null>
  /**
   * A real gateway calls back; the fake is driven from the page. Either way the
   * ledger moves only when this reports `paid`.
   */
  confirm: (paymentId: string) => Promise<Payment>
}

export type StoredFile = {
  key: string
  contentType: string
  byteSize: number
}

export interface FileStorage {
  readonly name: string
  put: (input: {
    body: Uint8Array
    contentType: string
    fileName: string
  }) => Promise<StoredFile>
  read: (key: string) => Promise<Uint8Array | null>
  delete: (key: string) => Promise<void>
}

export type PushMessage = {
  userId: string
  title: string
  body: string
  /** Where tapping it should land. */
  path?: string
}

export interface PushSender {
  readonly name: string
  send: (message: PushMessage) => Promise<void>
}

export type Providers = {
  otp: OtpSender
  payments: PaymentGateway
  storage: FileStorage
  push: PushSender
}
