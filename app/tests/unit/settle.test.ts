import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '#/db/client'
import { describeSettlementProblems } from '#/lib/settlement'
import { confirmSettlement, startSettlement } from '#/db/queries/settle'
import { getConnectionSummary, listTransactions } from '#/db/queries/ledger'
import { eventsSince } from '#/db/queries/events'
import { createFakePaymentGateway } from '#/providers/payments-fake'
import { riyalsToHalalas } from '#/lib/money'
import { createTestDatabase } from '../support/database'
import {
  makeConnection,
  makeMerchant,
  makeTransaction,
  makeUser,
} from '../support/factories'

describe('describeSettlementProblems', () => {
  const owed = { balanceHalalas: riyalsToHalalas(800) }

  it('takes part of what is owed, or all of it', () => {
    expect(
      describeSettlementProblems({
        ...owed,
        amountHalalas: riyalsToHalalas(200),
      }),
    ).toEqual([])
    expect(
      describeSettlementProblems({
        ...owed,
        amountHalalas: riyalsToHalalas(800),
      }),
    ).toEqual([])
  })

  it('refuses more than is owed', () => {
    expect(
      describeSettlementProblems({
        ...owed,
        amountHalalas: riyalsToHalalas(800) + 1,
      }),
    ).toEqual(['more'])
  })

  it.each([[0], [-1], [10.5]])('refuses %s halalas', (amountHalalas) => {
    expect(describeSettlementProblems({ ...owed, amountHalalas })).toEqual([
      'amount',
    ])
  })

  it('has nothing to settle on a cleared account', () => {
    expect(
      describeSettlementProblems({
        balanceHalalas: 0,
        amountHalalas: riyalsToHalalas(10),
      }),
    ).toEqual(['nothing'])
  })
})

let db: Database
let gateway: ReturnType<typeof createFakePaymentGateway>

beforeEach(async () => {
  db = await createTestDatabase()
  gateway = createFakePaymentGateway()
})

async function accountOwing(riyals = 800) {
  const owner = await makeUser(db)
  const merchant = await makeMerchant(db, {
    ownerUserId: owner.id,
    defaultLimitHalalas: riyalsToHalalas(1000),
  })
  const customer = await makeUser(db)
  const connection = await makeConnection(db, {
    merchantId: merchant.id,
    customerUserId: customer.id,
  })
  await makeTransaction(db, {
    connectionId: connection.id,
    amountHalalas: riyalsToHalalas(riyals),
  })
  return { owner, merchant, customer, connection }
}

describe('starting a settlement', () => {
  it('writes a pending payment and moves nothing yet', async () => {
    const { customer, connection } = await accountOwing()

    const started = await startSettlement(db, gateway, {
      connectionId: connection.id,
      customerUserId: customer.id,
      amountHalalas: riyalsToHalalas(300),
      method: 'mada',
      requestId: 'settle-1',
    })

    expect(started).toMatchObject({ ok: true, repeated: false })
    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(riyalsToHalalas(800))

    const rows = await listTransactions(db, connection.id)
    const payment = rows.find((row) => row.kind === 'payment')
    expect(payment?.status).toBe('pending')
    expect(payment?.paymentMethod).toBe('mada')
  })

  it('settles once however many times the request arrives', async () => {
    const { customer, connection } = await accountOwing()
    const settle = () =>
      startSettlement(db, gateway, {
        connectionId: connection.id,
        customerUserId: customer.id,
        amountHalalas: riyalsToHalalas(300),
        method: 'card',
        requestId: 'the-same-settlement',
      })

    const first = await settle()
    const second = await settle()

    expect(second).toMatchObject({ ok: true, repeated: true })
    if (first.ok && second.ok) {
      expect(second.transactionId).toBe(first.transactionId)
    }
    const payments = (await listTransactions(db, connection.id)).filter(
      (row) => row.kind === 'payment',
    )
    expect(payments).toHaveLength(1)
  })

  it('refuses more than is owed, and somebody else’s account', async () => {
    const { customer, connection } = await accountOwing()
    const stranger = await makeUser(db)

    expect(
      await startSettlement(db, gateway, {
        connectionId: connection.id,
        customerUserId: customer.id,
        amountHalalas: riyalsToHalalas(900),
        method: 'card',
        requestId: 'too-much',
      }),
    ).toEqual({ ok: false, problems: ['more'] })

    expect(
      await startSettlement(db, gateway, {
        connectionId: connection.id,
        customerUserId: stranger.id,
        amountHalalas: riyalsToHalalas(100),
        method: 'card',
        requestId: 'not-mine',
      }),
    ).toEqual({ ok: false, problems: ['connection'] })
  })
})

describe('confirming a settlement', () => {
  it('drops the balance, writes a receipt, and tells the shop', async () => {
    const { owner, customer, connection } = await accountOwing()
    const started = await startSettlement(db, gateway, {
      connectionId: connection.id,
      customerUserId: customer.id,
      amountHalalas: riyalsToHalalas(300),
      method: 'apple_pay',
      requestId: 'settle-paid',
    })
    if (!started.ok) throw new Error('the settlement was refused')

    const state = await confirmSettlement(db, gateway, {
      transactionId: started.transactionId,
      customerUserId: customer.id,
    })

    expect(state?.status).toBe('applied')
    expect(state?.receiptReference).toMatch(/^FAKE-/)

    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(riyalsToHalalas(500))
    expect(summary?.payments).toBe(1)

    const events = await eventsSince(db, owner.id, 0)
    expect(events.at(-1)?.kind).toBe('payment.received')
  })

  it('leaves the balance alone when the gateway refuses', async () => {
    const { customer, connection } = await accountOwing()
    const started = await startSettlement(db, gateway, {
      connectionId: connection.id,
      customerUserId: customer.id,
      amountHalalas: riyalsToHalalas(300),
      method: 'card',
      requestId: 'settle-failed',
    })
    if (!started.ok) throw new Error('the settlement was refused')
    gateway.failNext('The card was declined')

    const state = await confirmSettlement(db, gateway, {
      transactionId: started.transactionId,
      customerUserId: customer.id,
    })

    expect(state?.status).toBe('failed')
    expect(state?.failureReason).toBe('The card was declined')

    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(riyalsToHalalas(800))
  })

  it('says the same thing when asked twice', async () => {
    const { customer, connection } = await accountOwing()
    const started = await startSettlement(db, gateway, {
      connectionId: connection.id,
      customerUserId: customer.id,
      amountHalalas: riyalsToHalalas(300),
      method: 'card',
      requestId: 'settle-twice',
    })
    if (!started.ok) throw new Error('the settlement was refused')

    const first = await confirmSettlement(db, gateway, {
      transactionId: started.transactionId,
      customerUserId: customer.id,
    })
    const again = await confirmSettlement(db, gateway, {
      transactionId: started.transactionId,
      customerUserId: customer.id,
    })

    expect(again).toEqual(first)
    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(riyalsToHalalas(500))
  })

  it('is nobody else’s to confirm', async () => {
    const { customer, connection } = await accountOwing()
    const stranger = await makeUser(db)
    const started = await startSettlement(db, gateway, {
      connectionId: connection.id,
      customerUserId: customer.id,
      amountHalalas: riyalsToHalalas(100),
      method: 'card',
      requestId: 'settle-stranger',
    })
    if (!started.ok) throw new Error('the settlement was refused')

    expect(
      await confirmSettlement(db, gateway, {
        transactionId: started.transactionId,
        customerUserId: stranger.id,
      }),
    ).toBeNull()
  })
})
