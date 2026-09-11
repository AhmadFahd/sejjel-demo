import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '#/db/client'
import {
  MAX_PURCHASE_RIYALS,
  assessPurchase,
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
import {
  makeConnection,
  makeMerchant,
  makeTransaction,
} from '../support/factories'

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

describe('assessPurchase', () => {
  const account = {
    balanceHalalas: riyalsToHalalas(800),
    limitHalalas: riyalsToHalalas(1000),
  }

  it('allows the purchase that lands exactly on the limit', () => {
    const check = assessPurchase({
      ...account,
      amountHalalas: riyalsToHalalas(200),
    })

    expect(check.problems).toEqual([])
    expect(check.overByHalalas).toBe(0)
    expect(check.availableHalalas).toBe(riyalsToHalalas(200))
  })

  it('refuses the one that is a halala over, and says by how much', () => {
    const check = assessPurchase({
      ...account,
      amountHalalas: riyalsToHalalas(200) + 1,
    })

    expect(check.problems).toEqual(['limit'])
    expect(check.overByHalalas).toBe(1)
    expect(check.availableHalalas).toBe(riyalsToHalalas(200))
  })

  it('warns about a customer who is late but inside their limit', () => {
    const check = assessPurchase({
      ...account,
      amountHalalas: riyalsToHalalas(100),
      dueState: 'overdue',
      daysOverdue: 9,
    })

    expect(check.problems).toEqual(['overdue'])
    expect(check.overdueHalalas).toBe(riyalsToHalalas(800))
    expect(check.daysOverdue).toBe(9)
  })

  it('lets the merchant go past the warning', () => {
    expect(
      assessPurchase({
        ...account,
        amountHalalas: riyalsToHalalas(100),
        dueState: 'overdue',
        daysOverdue: 9,
        acknowledgedOverdue: true,
      }).problems,
    ).toEqual([])
  })

  it('does not call a settled account late, whatever its old dates say', () => {
    expect(
      assessPurchase({
        balanceHalalas: 0,
        limitHalalas: riyalsToHalalas(1000),
        amountHalalas: riyalsToHalalas(100),
        dueState: 'overdue',
        daysOverdue: 40,
      }).problems,
    ).toEqual([])
  })

  it('stops at the limit even when the customer is also late', () => {
    const check = assessPurchase({
      ...account,
      amountHalalas: riyalsToHalalas(500),
      dueState: 'overdue',
      daysOverdue: 9,
      acknowledgedOverdue: true,
    })

    // The line the shop set holds whatever the merchant agrees to.
    expect(check.problems).toEqual(['limit'])
    expect(check.overByHalalas).toBe(riyalsToHalalas(300))
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

    expect(result).toMatchObject({
      ok: false,
      problems: ['limit'],
      overByHalalas: riyalsToHalalas(1),
      availableHalalas: riyalsToHalalas(1000),
    })
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

    expect(result).toMatchObject({ ok: false, problems: ['connection'] })
  })
})

describe('recording for a customer who is late', () => {
  async function lateAccount() {
    const merchant = await makeMerchant(db, {
      defaultLimitHalalas: riyalsToHalalas(1000),
      defaultTermDays: 30,
    })
    const connection = await makeConnection(db, { merchantId: merchant.id })
    // Owed, and past a date that has gone.
    await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(400),
      dueAt: new Date('2026-09-01T00:00:00+03:00'),
    })
    return { merchant, connection }
  }

  const now = new Date('2026-09-15T10:00:00+03:00')

  it('warns rather than records, until the merchant says go on', async () => {
    const { merchant, connection } = await lateAccount()

    const warned = await recordPendingPurchase(db, {
      connectionId: connection.id,
      merchantId: merchant.id,
      amountHalalas: riyalsToHalalas(100),
      requestId: 'warned',
      now,
    })

    expect(warned).toMatchObject({
      ok: false,
      problems: ['overdue'],
      overdueHalalas: riyalsToHalalas(400),
      daysOverdue: 14,
    })
    expect(await listTransactions(db, connection.id)).toHaveLength(1)
  })

  it('records who was warned and went on anyway', async () => {
    const { merchant, connection } = await lateAccount()

    const recorded = await recordPendingPurchase(db, {
      connectionId: connection.id,
      merchantId: merchant.id,
      amountHalalas: riyalsToHalalas(100),
      requestId: 'went-on',
      acknowledgedOverdue: true,
      now,
    })

    expect(recorded).toMatchObject({ ok: true })
    const rows = await listTransactions(db, connection.id)
    const recordedRow = rows.find((row) => row.status === 'pending')
    expect(recordedRow?.overdueAcknowledged).toBe(true)
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
