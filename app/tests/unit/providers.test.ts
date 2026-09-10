import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assertProductionSafe,
  createProviders,
  providerConfigFromEnv,
} from '#/providers/registry'
import { createFakePaymentGateway } from '#/providers/payments-fake'
import { createDiskStorage } from '#/providers/storage-disk'
import { createLoggingOtpSender } from '#/providers/otp-log'

const developmentConfig = {
  otp: 'log',
  payments: 'fake',
  storage: 'disk',
  push: 'log',
  storageRoot: './storage/invoices',
  appEnv: 'development',
  isProduction: false,
}

describe('provider configuration', () => {
  it('defaults to the fakes and disk storage', () => {
    expect(providerConfigFromEnv({})).toEqual(developmentConfig)
  })

  it('refuses to start in production on a fake OTP sender or gateway', () => {
    expect(() =>
      assertProductionSafe({
        ...developmentConfig,
        appEnv: 'production',
        isProduction: true,
      }),
    ).toThrow(/otp, payments, push/)
  })

  it('allows disk storage in production, which is the real implementation', () => {
    expect(() =>
      assertProductionSafe({
        ...developmentConfig,
        appEnv: 'production',
        isProduction: true,
        otp: 'sms',
        payments: 'moyasar',
        push: 'webpush',
      }),
    ).not.toThrow()
  })

  it('says so when a provider name means nothing', () => {
    expect(() =>
      createProviders({ ...developmentConfig, payments: 'stripe' }),
    ).toThrow(/PAYMENTS_PROVIDER=stripe/)
  })
})

describe('the logging OTP sender', () => {
  it('writes the code to the log and returns nothing a caller could leak', async () => {
    const written: Array<[string, string]> = []
    const sender = createLoggingOtpSender((phoneNumber, code) =>
      written.push([phoneNumber, code]),
    )

    const result = await sender.send({
      phoneNumber: '+966550123456',
      code: '4821',
    })

    expect(result).toBeUndefined()
    expect(written).toEqual([['+966550123456', '4821']])
  })
})

describe('the fake payment gateway', () => {
  it('starts pending and only then reports paid, with a receipt', async () => {
    const gateway = createFakePaymentGateway()

    const started = await gateway.start({
      amountHalalas: 80000,
      method: 'mada',
      idempotencyKey: 'settle-1',
    })
    expect(started.state).toBe('pending')

    const confirmed = await gateway.confirm(started.id)
    expect(confirmed.state).toBe('paid')
    expect(confirmed.receiptReference).toMatch(/^FAKE-/)
  })

  it('fails on demand, and leaves no receipt behind', async () => {
    const gateway = createFakePaymentGateway()
    gateway.failNext('The card was declined')

    const started = await gateway.start({
      amountHalalas: 80000,
      method: 'card',
      idempotencyKey: 'settle-2',
    })
    const failed = await gateway.confirm(started.id)

    expect(failed.state).toBe('failed')
    expect(failed.failureReason).toBe('The card was declined')
    expect(failed.receiptReference).toBeNull()
  })

  it('settles once when the same request arrives twice', async () => {
    const gateway = createFakePaymentGateway()
    const input = {
      amountHalalas: 80000,
      method: 'apple_pay' as const,
      idempotencyKey: 'settle-3',
    }

    const first = await gateway.start(input)
    const second = await gateway.start(input)

    expect(second.id).toBe(first.id)
  })

  it('does not move a payment that already settled', async () => {
    const gateway = createFakePaymentGateway()
    const started = await gateway.start({
      amountHalalas: 100,
      method: 'card',
      idempotencyKey: 'settle-4',
    })
    await gateway.confirm(started.id)
    gateway.failNext()

    expect((await gateway.confirm(started.id)).state).toBe('paid')
  })
})

describe('disk storage', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'sejjel-storage-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('stores a file, reads it back, and forgets it when deleted', async () => {
    const storage = createDiskStorage(root)
    const body = new TextEncoder().encode('invoice')

    const stored = await storage.put({
      body,
      contentType: 'image/png',
      fileName: 'invoice.png',
    })

    expect(stored.byteSize).toBe(body.byteLength)
    expect(stored.key).toMatch(/\.png$/)
    expect(await storage.read(stored.key)).toEqual(body)

    await storage.delete(stored.key)
    expect(await storage.read(stored.key)).toBeNull()
  })

  it('reports a missing file as missing rather than throwing', async () => {
    const storage = createDiskStorage(root)
    expect(await storage.read('ab/does-not-exist.png')).toBeNull()
  })

  it('refuses a key that climbs out of the root', async () => {
    const storage = createDiskStorage(root)
    await expect(storage.read('../../etc/passwd')).rejects.toThrow(
      /outside the root/,
    )
  })
})
