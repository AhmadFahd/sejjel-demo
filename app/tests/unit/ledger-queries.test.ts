import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '#/db/client'
import { balanceOf } from '#/db/derive'
import {
  getConnectionSummary,
  getCustomerTotals,
  getMerchantTotals,
  listCustomerConnections,
  listMerchantConnections,
  listTransactions,
} from '#/db/queries/ledger'
import { riyalsToHalalas } from '#/lib/money'
import { createTestDatabase } from '../support/database'
import {
  makeConnection,
  makeMerchant,
  makeTransaction,
  makeUser,
} from '../support/factories'

let db: Database

beforeEach(async () => {
  db = await createTestDatabase()
})

describe('listMerchantConnections', () => {
  it('derives the same balance in SQL as the rule does in TypeScript', async () => {
    const merchant = await makeMerchant(db, { name: 'بقالة الريان' })
    const customer = await makeUser(db, { name: 'أحمد محمد' })
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
    })

    const entries = [
      {
        kind: 'purchase' as const,
        status: 'applied' as const,
        amountHalalas: riyalsToHalalas(1000),
      },
      {
        kind: 'payment' as const,
        status: 'applied' as const,
        amountHalalas: riyalsToHalalas(200),
      },
      {
        kind: 'purchase' as const,
        status: 'pending' as const,
        amountHalalas: riyalsToHalalas(500),
      },
    ]
    for (const entry of entries) {
      await makeTransaction(db, { connectionId: connection.id, ...entry })
    }

    const [summary] = await listMerchantConnections(db, merchant.id)

    expect(summary.balanceHalalas).toBe(balanceOf(entries))
    expect(summary.balanceHalalas).toBe(riyalsToHalalas(800))
    expect(summary.purchases).toBe(1)
    expect(summary.payments).toBe(1)
  })

  it('reports a customer with no transactions at zero, not missing', async () => {
    const merchant = await makeMerchant(db)
    await makeConnection(db, { merchantId: merchant.id })

    const [summary] = await listMerchantConnections(db, merchant.id)

    expect(summary.balanceHalalas).toBe(0)
    expect(summary.availableHalalas).toBe(summary.limitHalalas)
    expect(summary.dueAt).toBeNull()
  })

  it('applies the per-connection override over the shop default', async () => {
    const merchant = await makeMerchant(db, {
      defaultLimitHalalas: riyalsToHalalas(1000),
      defaultTermDays: 30,
    })
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      limitOverrideHalalas: riyalsToHalalas(1500),
      termOverrideDays: 14,
    })
    await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(1250),
    })

    const summary = await getConnectionSummary(db, connection.id)

    expect(summary?.limitHalalas).toBe(riyalsToHalalas(1500))
    expect(summary?.termDays).toBe(14)
    expect(summary?.availableHalalas).toBe(riyalsToHalalas(250))
  })

  it('leaves out connections that are not active yet', async () => {
    const merchant = await makeMerchant(db)
    await makeConnection(db, { merchantId: merchant.id, status: 'pending' })

    expect(await listMerchantConnections(db, merchant.id)).toHaveLength(0)
  })

  it('reports the furthest due date among applied purchases', async () => {
    const merchant = await makeMerchant(db)
    const connection = await makeConnection(db, { merchantId: merchant.id })
    await makeTransaction(db, {
      connectionId: connection.id,
      dueAt: new Date('2026-09-08T00:00:00Z'),
    })
    await makeTransaction(db, {
      connectionId: connection.id,
      dueAt: new Date('2026-09-15T00:00:00Z'),
    })

    const [summary] = await listMerchantConnections(db, merchant.id)

    expect(summary.dueAt).toEqual(new Date('2026-09-15T00:00:00Z'))
  })
})

describe('listCustomerConnections', () => {
  it('gives one customer every shop they owe', async () => {
    const customer = await makeUser(db, { name: 'أحمد محمد' })
    const noor = await makeMerchant(db, { name: 'سوق النور' })
    const duha = await makeMerchant(db, { name: 'مخبز الضحى' })

    const atNoor = await makeConnection(db, {
      merchantId: noor.id,
      customerUserId: customer.id,
    })
    const atDuha = await makeConnection(db, {
      merchantId: duha.id,
      customerUserId: customer.id,
    })
    await makeTransaction(db, {
      connectionId: atNoor.id,
      amountHalalas: riyalsToHalalas(350),
    })
    await makeTransaction(db, {
      connectionId: atNoor.id,
      kind: 'payment',
      amountHalalas: riyalsToHalalas(350),
    })
    await makeTransaction(db, {
      connectionId: atDuha.id,
      amountHalalas: riyalsToHalalas(420),
    })

    const rows = await listCustomerConnections(db, customer.id)
    const byName = Object.fromEntries(
      rows.map((row) => [row.merchantName, row.balanceHalalas]),
    )

    expect(byName).toEqual({
      'سوق النور': 0,
      'مخبز الضحى': riyalsToHalalas(420),
    })
  })
})

describe('listTransactions', () => {
  it('returns the newest first and pages', async () => {
    const connection = await makeConnection(db)
    for (const day of [1, 2, 3]) {
      await makeTransaction(db, {
        connectionId: connection.id,
        amountHalalas: riyalsToHalalas(day * 100),
        createdAt: new Date(`2026-09-0${day}T00:00:00Z`),
      })
    }

    const firstPage = await listTransactions(db, connection.id, { limit: 2 })
    const secondPage = await listTransactions(db, connection.id, {
      limit: 2,
      offset: 2,
    })

    expect(firstPage.map((t) => t.amountHalalas)).toEqual([
      riyalsToHalalas(300),
      riyalsToHalalas(200),
    ])
    expect(secondPage.map((t) => t.amountHalalas)).toEqual([
      riyalsToHalalas(100),
    ])
  })
})

/**
 * UC-19: the state a screen shows is worked out against the clock it is given,
 * so the same rows read differently on a different day with nothing rewritten.
 */
describe('due state against the clock', () => {
  const tuesday = new Date('2026-09-15T00:00:00+03:00')

  async function summaryOn(now: Date, dueAt: Date) {
    const merchant = await makeMerchant(db, {
      defaultLimitHalalas: riyalsToHalalas(1000),
    })
    const connection = await makeConnection(db, { merchantId: merchant.id })
    await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(400),
      dueAt,
    })

    const summary = await getConnectionSummary(db, connection.id, now)
    if (!summary) throw new Error('the connection went missing')
    return summary
  }

  it('is open while the date is still a week off', async () => {
    const summary = await summaryOn(
      new Date('2026-09-08T20:00:00+03:00'),
      tuesday,
    )

    expect(summary.dueState).toBe('open')
    expect(summary.status).toBe('open')
    expect(summary.daysOverdue).toBe(0)
  })

  it('warns two days out, and the day itself still counts as time left', async () => {
    const sunday = await summaryOn(
      new Date('2026-09-13T06:00:00+03:00'),
      tuesday,
    )
    const theDay = await summaryOn(
      new Date('2026-09-15T23:00:00+03:00'),
      tuesday,
    )

    expect(sunday.dueState).toBe('due_soon')
    expect(sunday.status).toBe('due_soon')
    expect(theDay.dueState).toBe('due_soon')
    expect(theDay.daysOverdue).toBe(0)
  })

  it('turns overdue on its own once the day is past', async () => {
    const summary = await summaryOn(
      new Date('2026-09-18T00:30:00+03:00'),
      tuesday,
    )

    expect(summary.dueState).toBe('overdue')
    expect(summary.status).toBe('overdue')
    expect(summary.daysOverdue).toBe(3)
  })

  it('says nothing is due when nothing has a date', async () => {
    const merchant = await makeMerchant(db)
    const connection = await makeConnection(db, { merchantId: merchant.id })

    const [summary] = await listMerchantConnections(db, merchant.id)

    expect(summary.connectionId).toBe(connection.id)
    expect(summary.dueState).toBe('none')
    expect(summary.status).toBe('settled')
  })
})

describe('getMerchantTotals', () => {
  it('sums the shop position in SQL, over every customer and not a page', async () => {
    const merchant = await makeMerchant(db, {
      defaultLimitHalalas: riyalsToHalalas(1000),
    })
    const owing = await makeConnection(db, { merchantId: merchant.id })
    const settled = await makeConnection(db, { merchantId: merchant.id })
    await makeTransaction(db, {
      connectionId: owing.id,
      amountHalalas: riyalsToHalalas(800),
    })
    await makeTransaction(db, {
      connectionId: settled.id,
      amountHalalas: riyalsToHalalas(350),
    })
    await makeTransaction(db, {
      connectionId: settled.id,
      kind: 'payment',
      amountHalalas: riyalsToHalalas(350),
    })

    const totals = await getMerchantTotals(db, merchant.id)

    expect(totals.connections).toBe(2)
    expect(totals.outstandingHalalas).toBe(riyalsToHalalas(800))
    expect(totals.overdueHalalas).toBe(0)
    expect(totals.purchases).toBe(2)
    expect(totals.payments).toBe(1)
  })

  it('counts as overdue only what is owed past a due day that has gone', async () => {
    const merchant = await makeMerchant(db)
    const late = await makeConnection(db, { merchantId: merchant.id })
    const soon = await makeConnection(db, { merchantId: merchant.id })
    const paidLate = await makeConnection(db, { merchantId: merchant.id })

    await makeTransaction(db, {
      connectionId: late.id,
      amountHalalas: riyalsToHalalas(500),
      dueAt: new Date('2026-09-08T00:00:00+03:00'),
    })
    await makeTransaction(db, {
      connectionId: soon.id,
      amountHalalas: riyalsToHalalas(300),
      dueAt: new Date('2026-09-22T00:00:00+03:00'),
    })
    // Owes nothing, so its gone-by date adds nothing to the overdue figure.
    await makeTransaction(db, {
      connectionId: paidLate.id,
      amountHalalas: riyalsToHalalas(200),
      dueAt: new Date('2026-09-01T00:00:00+03:00'),
    })
    await makeTransaction(db, {
      connectionId: paidLate.id,
      kind: 'payment',
      amountHalalas: riyalsToHalalas(200),
    })

    const totals = await getMerchantTotals(
      db,
      merchant.id,
      new Date('2026-09-15T02:00:00+03:00'),
    )

    expect(totals.outstandingHalalas).toBe(riyalsToHalalas(800))
    expect(totals.overdueHalalas).toBe(riyalsToHalalas(500))
  })

  it('reads a shop with no customers as zero rather than nothing', async () => {
    const merchant = await makeMerchant(db)

    expect(await getMerchantTotals(db, merchant.id)).toEqual({
      connections: 0,
      outstandingHalalas: 0,
      overdueHalalas: 0,
      purchases: 0,
      payments: 0,
    })
  })

  it('leaves out another shop’s customers', async () => {
    const mine = await makeMerchant(db)
    const theirs = await makeMerchant(db)
    const theirCustomer = await makeConnection(db, { merchantId: theirs.id })
    await makeTransaction(db, {
      connectionId: theirCustomer.id,
      amountHalalas: riyalsToHalalas(900),
    })

    const totals = await getMerchantTotals(db, mine.id)

    expect(totals.connections).toBe(0)
    expect(totals.outstandingHalalas).toBe(0)
  })
})

describe('getCustomerTotals', () => {
  it('adds up what one person owes across shops, and nobody else’s debt', async () => {
    const customer = await makeUser(db)
    const stranger = await makeUser(db)
    const noor = await makeMerchant(db, { name: 'سوق النور' })
    const duha = await makeMerchant(db, { name: 'مخبز الضحى' })

    const atNoor = await makeConnection(db, {
      merchantId: noor.id,
      customerUserId: customer.id,
    })
    const atDuha = await makeConnection(db, {
      merchantId: duha.id,
      customerUserId: customer.id,
    })
    const theirs = await makeConnection(db, {
      merchantId: noor.id,
      customerUserId: stranger.id,
    })

    await makeTransaction(db, {
      connectionId: atNoor.id,
      amountHalalas: riyalsToHalalas(350),
    })
    await makeTransaction(db, {
      connectionId: atDuha.id,
      amountHalalas: riyalsToHalalas(420),
    })
    await makeTransaction(db, {
      connectionId: theirs.id,
      amountHalalas: riyalsToHalalas(900),
    })

    const totals = await getCustomerTotals(db, customer.id)

    expect(totals.connections).toBe(2)
    expect(totals.outstandingHalalas).toBe(riyalsToHalalas(770))
    expect(totals.purchases).toBe(2)
  })
})

describe('paging the customer list', () => {
  it('keeps a name shared by two customers on one page each', async () => {
    const merchant = await makeMerchant(db)
    for (const name of ['أحمد محمد', 'أحمد محمد', 'خالد علي']) {
      const customer = await makeUser(db, { name })
      await makeConnection(db, {
        merchantId: merchant.id,
        customerUserId: customer.id,
      })
    }

    const first = await listMerchantConnections(db, merchant.id, new Date(), {
      limit: 2,
    })
    const second = await listMerchantConnections(db, merchant.id, new Date(), {
      limit: 2,
      offset: 2,
    })

    expect(first).toHaveLength(2)
    expect(second).toHaveLength(1)
    expect(
      new Set([...first, ...second].map((row) => row.connectionId)).size,
    ).toBe(3)
    expect(second[0].customerName).toBe('خالد علي')
  })

  it('adds up each row of the page, and only its own', async () => {
    const merchant = await makeMerchant(db)
    const amounts = [riyalsToHalalas(100), riyalsToHalalas(250)]
    for (const [index, name] of ['أحمد محمد', 'خالد علي'].entries()) {
      const customer = await makeUser(db, { name })
      const connection = await makeConnection(db, {
        merchantId: merchant.id,
        customerUserId: customer.id,
      })
      await makeTransaction(db, {
        connectionId: connection.id,
        amountHalalas: amounts[index],
      })
    }

    // A page at a time: the sums belong to the row they are on, whichever
    // page that row is on.
    const first = await listMerchantConnections(db, merchant.id, new Date(), {
      limit: 1,
    })
    const second = await listMerchantConnections(db, merchant.id, new Date(), {
      limit: 1,
      offset: 1,
    })

    expect(first[0].customerName).toBe('أحمد محمد')
    expect(first[0].balanceHalalas).toBe(amounts[0])
    expect(second[0].customerName).toBe('خالد علي')
    expect(second[0].balanceHalalas).toBe(amounts[1])
  })
})

/** #77: the same paging the shop's list of customers already had. */
describe('paging the customer’s list of shops', () => {
  it('keeps a name shared by two shops on one page each', async () => {
    const customer = await makeUser(db, { name: 'أحمد محمد' })
    for (const name of ['بقالة الريان', 'بقالة الريان', 'مخبز الضحى']) {
      const merchant = await makeMerchant(db, { name })
      await makeConnection(db, {
        merchantId: merchant.id,
        customerUserId: customer.id,
      })
    }

    const first = await listCustomerConnections(db, customer.id, new Date(), {
      limit: 2,
    })
    const second = await listCustomerConnections(db, customer.id, new Date(), {
      limit: 2,
      offset: 2,
    })

    expect(first).toHaveLength(2)
    expect(second).toHaveLength(1)
    expect(
      new Set([...first, ...second].map((row) => row.connectionId)).size,
    ).toBe(3)
    expect(second[0].merchantName).toBe('مخبز الضحى')
  })

  it('adds up each row of the page, and only its own', async () => {
    const customer = await makeUser(db)
    const amounts = [riyalsToHalalas(100), riyalsToHalalas(250)]
    for (const [index, name] of ['بقالة الريان', 'مخبز الضحى'].entries()) {
      const merchant = await makeMerchant(db, { name })
      const connection = await makeConnection(db, {
        merchantId: merchant.id,
        customerUserId: customer.id,
      })
      await makeTransaction(db, {
        connectionId: connection.id,
        amountHalalas: amounts[index],
      })
    }

    const first = await listCustomerConnections(db, customer.id, new Date(), {
      limit: 1,
    })
    const second = await listCustomerConnections(db, customer.id, new Date(), {
      limit: 1,
      offset: 1,
    })

    expect(first[0].merchantName).toBe('بقالة الريان')
    expect(first[0].balanceHalalas).toBe(amounts[0])
    expect(second[0].merchantName).toBe('مخبز الضحى')
    expect(second[0].balanceHalalas).toBe(amounts[1])
  })

  it('reads the whole list in one page when it fits, ordered by shop name', async () => {
    const customer = await makeUser(db)
    for (const name of ['مخبز الضحى', 'بقالة الريان', 'سوق النور']) {
      const merchant = await makeMerchant(db, { name })
      await makeConnection(db, {
        merchantId: merchant.id,
        customerUserId: customer.id,
      })
    }

    const rows = await listCustomerConnections(db, customer.id)

    expect(rows.map((row) => row.merchantName)).toEqual([
      'بقالة الريان',
      'سوق النور',
      'مخبز الضحى',
    ])
  })
})
