import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '#/db/client'
import { HISTORY_PAGE_SIZE, readAccountPage } from '#/db/queries/account'
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

async function accountWith(operations: number) {
  const merchant = await makeMerchant(db, { name: 'بقالة الريان' })
  const customer = await makeUser(db, { name: 'أحمد محمد' })
  const connection = await makeConnection(db, {
    merchantId: merchant.id,
    customerUserId: customer.id,
  })

  for (let day = 1; day <= operations; day += 1) {
    await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(day),
      createdAt: new Date(2026, 0, day),
    })
  }

  return connection
}

describe('readAccountPage', () => {
  it('gives the summary and the history, newest first', async () => {
    const connection = await accountWith(3)

    const account = await readAccountPage(db, connection.id, 1)

    expect(account?.summary.customerName).toBe('أحمد محمد')
    expect(account?.summary.merchantName).toBe('بقالة الريان')
    expect(account?.transactions.map((row) => row.amountHalalas)).toEqual([
      riyalsToHalalas(3),
      riyalsToHalalas(2),
      riyalsToHalalas(1),
    ])
    expect(account?.hasMore).toBe(false)
  })

  it('pages, and knows there is more without counting the history', async () => {
    const connection = await accountWith(HISTORY_PAGE_SIZE + 2)

    const first = await readAccountPage(db, connection.id, 1)
    const second = await readAccountPage(db, connection.id, 2)

    expect(first?.transactions).toHaveLength(HISTORY_PAGE_SIZE)
    expect(first?.hasMore).toBe(true)
    expect(second?.transactions).toHaveLength(2)
    expect(second?.hasMore).toBe(false)
  })

  it('counts a pending purchase in the history but not in the balance', async () => {
    const connection = await accountWith(0)
    await makeTransaction(db, {
      connectionId: connection.id,
      status: 'pending',
      amountHalalas: riyalsToHalalas(500),
    })

    const account = await readAccountPage(db, connection.id, 1)

    expect(account?.transactions).toHaveLength(1)
    expect(account?.summary.balanceHalalas).toBe(0)
    expect(account?.summary.purchases).toBe(0)
    expect(account?.hasMore).toBe(false)
  })

  it('answers with nothing for a connection that does not exist', async () => {
    expect(await readAccountPage(db, 'not-a-connection', 1)).toBeNull()
  })
})
