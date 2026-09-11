import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '#/db/client'
import {
  MAX_PURCHASE_RIYALS,
  describePurchaseProblems,
  expiryFrom,
  hasExpired,
  projectBalance,
} from '#/lib/purchase'
import {
  cancelPendingPurchase,
  recordPendingPurchase,
} from '#/db/queries/purchases'
import { getConnectionSummary, listTransactions } from '#/db/queries/ledger'
import { riyalsToHalalas } from '#/lib/money'
import { PAYDAY_WEEKDAY, riyadhWeekday } from '#/lib/payday'
import { createTestDatabase } from '../support/database'
import { makeConnection, makeMerchant } from '../support/factories'

describe('describePurchaseProblems', () => {
  const account = {
    balanceHalalas: riyalsToHalalas(800),
    limitHalalas: riyalsToHalalas(1000),
  }

  it('accepts a purchase that fits inside the limit', () => {
    expect(
      describePurchaseProblems({
        ...account,
        amountHalalas: riyalsToHalalas(200),
      }),
    ).toEqual([])
  })

  it('refuses the purchase that takes the balance past the limit', () => {
    expect(describePurchaseProblems({ ...account, amountHalalas: 1 })).toEqual(
      [],
    )
    expect(
      describePurchaseProblems({
        ...account,
        amountHalalas: riyalsToHalalas(200) + 1,
      }),
    ).toEqual(['limit'])
  })

  it.each([[0], [-1], [12.5]])('refuses %s halalas', (amountHalalas) => {
    expect(describePurchaseProblems({ ...account, amountHalalas })).toEqual([
      'amount',
    ])
  })

  it('refuses an amount nobody records in a grocery', () => {
    expect(
      describePurchaseProblems({
        balanceHalalas: 0,
        limitHalalas: riyalsToHalalas(MAX_PURCHASE_RIYALS * 2),
        amountHalalas: riyalsToHalalas(MAX_PURCHASE_RIYALS + 1),
      }),
    ).toEqual(['ceiling'])
  })
})

describe('projectBalance', () => {
  it('says what the account would read as', () => {
    expect(
      projectBalance({
        amountHalalas: riyalsToHalalas(300),
        balanceHalalas: riyalsToHalalas(800),
        limitHalalas: riyalsToHalalas(1500),
      }),
    ).toEqual({
      balanceHalalas: riyalsToHalalas(1100),
      limitHalalas: riyalsToHalalas(1500),
      availableHalalas: riyalsToHalalas(400),
    })
  })
})

describe('hasExpired', () => {
  const recordedAt = new Date('2026-09-15T10:00:00+03:00')

  it('is pending inside the window and expired past it', () => {
    const purchase = {
      status: 'pending',
      approvalExpiresAt: expiryFrom(recordedAt),
    }

    expect(hasExpired(purchase, new Date('2026-09-15T10:10:00+03:00'))).toBe(
      false,
    )
    expect(hasExpired(purchase, new Date('2026-09-15T10:20:00+03:00'))).toBe(
      true,
    )
  })

  it('says nothing about an operation that is not waiting', () => {
    expect(
      hasExpired(
        { status: 'applied', approvalExpiresAt: expiryFrom(recordedAt) },
        new Date('2027-01-01T00:00:00Z'),
      ),
    ).toBe(false)
  })
})

let db: Database

beforeEach(async () => {
  db = await createTestDatabase()
})

async function shopWithCustomer() {
  const merchant = await makeMerchant(db, {
    defaultLimitHalalas: riyalsToHalalas(1000),
    defaultTermDays: 30,
  })
  const connection = await makeConnection(db, { merchantId: merchant.id })
  return { merchant, connection }
}

describe('recordPendingPurchase', () => {
  it('lands pending, with the due date the term gives it', async () => {
    const { merchant, connection } = await shopWithCustomer()
    const now = new Date('2026-09-15T10:00:00+03:00')

    const result = await recordPendingPurchase(db, {
      connectionId: connection.id,
      merchantId: merchant.id,
      amountHalalas: riyalsToHalalas(250),
      description: 'مشتريات',
      requestId: 'request-1',
      now,
    })

    expect(result).toMatchObject({ ok: true, repeated: false })
    const [row] = await listTransactions(db, connection.id)
    expect(row.status).toBe('pending')
    expect(row.amountHalalas).toBe(riyalsToHalalas(250))
    expect(row.termDaysSnapshot).toBe(30)
    expect(riyadhWeekday(row.dueAt!)).toBe(PAYDAY_WEEKDAY)
    expect(row.approvalExpiresAt).toEqual(expiryFrom(now))

    // Pending is not owed yet.
    const summary = await getConnectionSummary(db, connection.id, now)
    expect(summary?.balanceHalalas).toBe(0)
  })

  it('makes one purchase however many times the same submit arrives', async () => {
    const { merchant, connection } = await shopWithCustomer()
    const submit = () =>
      recordPendingPurchase(db, {
        connectionId: connection.id,
        merchantId: merchant.id,
        amountHalalas: riyalsToHalalas(250),
        requestId: 'the-same-request',
      })

    const first = await submit()
    const second = await submit()

    expect(first).toMatchObject({ ok: true, repeated: false })
    expect(second).toMatchObject({ ok: true, repeated: true })
    if (first.ok && second.ok) {
      expect(second.transactionId).toBe(first.transactionId)
    }
    expect(await listTransactions(db, connection.id)).toHaveLength(1)
  })

  it('refuses an amount past the limit, and writes nothing', async () => {
    const { merchant, connection } = await shopWithCustomer()

    const result = await recordPendingPurchase(db, {
      connectionId: connection.id,
      merchantId: merchant.id,
      amountHalalas: riyalsToHalalas(1001),
      requestId: 'too-much',
    })

    expect(result).toEqual({ ok: false, problems: ['limit'] })
    expect(await listTransactions(db, connection.id)).toHaveLength(0)
  })

  it('refuses a connection that is not this shop’s', async () => {
    const { connection } = await shopWithCustomer()
    const someoneElse = await makeMerchant(db)

    const result = await recordPendingPurchase(db, {
      connectionId: connection.id,
      merchantId: someoneElse.id,
      amountHalalas: riyalsToHalalas(100),
      requestId: 'not-mine',
    })

    expect(result).toEqual({ ok: false, problems: ['connection'] })
  })
})

describe('cancelPendingPurchase', () => {
  it('calls off an operation the customer has not answered', async () => {
    const { merchant, connection } = await shopWithCustomer()
    const recorded = await recordPendingPurchase(db, {
      connectionId: connection.id,
      merchantId: merchant.id,
      amountHalalas: riyalsToHalalas(250),
      requestId: 'to-cancel',
    })
    if (!recorded.ok) throw new Error('the purchase was refused')

    expect(
      await cancelPendingPurchase(db, {
        transactionId: recorded.transactionId,
        merchantId: merchant.id,
      }),
    ).toBe(true)

    const [row] = await listTransactions(db, connection.id)
    expect(row.status).toBe('cancelled')
  })

  it('leaves another shop’s operation alone', async () => {
    const { merchant, connection } = await shopWithCustomer()
    const someoneElse = await makeMerchant(db)
    const recorded = await recordPendingPurchase(db, {
      connectionId: connection.id,
      merchantId: merchant.id,
      amountHalalas: riyalsToHalalas(250),
      requestId: 'not-theirs-to-cancel',
    })
    if (!recorded.ok) throw new Error('the purchase was refused')

    expect(
      await cancelPendingPurchase(db, {
        transactionId: recorded.transactionId,
        merchantId: someoneElse.id,
      }),
    ).toBe(false)

    const [row] = await listTransactions(db, connection.id)
    expect(row.status).toBe('pending')
  })
})
