import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import type { Database } from '#/db/client'
import { notifications, transactions } from '#/db/schema'
import {
  countUnread,
  listNotifications,
  markAllRead,
  noticeDueDates,
  sweepDueDates,
} from '#/db/queries/notifications'
import { listCustomerConnections } from '#/db/queries/ledger'
import { announce } from '#/db/queries/ledger-events'
import { recordPendingPurchase } from '#/db/queries/purchases'
import { declineOperation } from '#/db/queries/approval'
import { dueDateFor } from '#/lib/payday'
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

describe('what an event puts in the list', () => {
  it('writes a line for the person the event is addressed to', async () => {
    const person = await makeUser(db)
    const connection = await makeConnection(db, {
      customerUserId: person.id,
    })

    await announce(db, [
      {
        userId: person.id,
        kind: 'connection.requested',
        subjectId: connection.id,
      },
    ])

    const [row] = await listNotifications(db, person.id)
    expect(row.kind).toBe('connection_requested')
    expect(row.connectionId).toBe(connection.id)
    expect(row.readAt).toBeNull()
  })

  /**
   * A cancelled purchase moves the shop's screen on and is already visible in
   * the history, so it is not also a line in a list.
   */
  it('says nothing about the events that are not news', async () => {
    const person = await makeUser(db)

    await announce(db, [
      { userId: person.id, kind: 'purchase.cancelled', subjectId: 'x' },
      { userId: person.id, kind: 'connection.accepted', subjectId: 'y' },
    ])

    expect(await listNotifications(db, person.id)).toEqual([])
  })

  it('can be told to move a screen without telling anybody', async () => {
    const person = await makeUser(db)
    const connection = await makeConnection(db, { customerUserId: person.id })

    await announce(db, [
      {
        userId: person.id,
        kind: 'terms.changed',
        subjectId: connection.id,
        notify: false,
      },
    ])

    expect(await listNotifications(db, person.id)).toEqual([])
  })

  it('carries the shop and the amount, so a line reads on its own', async () => {
    const merchant = await makeMerchant(db, { name: 'بقالة الريان' })
    const customer = await makeUser(db)
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
    })
    const purchase = await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(120),
      status: 'pending',
    })

    await announce(db, [
      {
        userId: customer.id,
        kind: 'purchase.recorded',
        subjectId: purchase.id,
      },
    ])

    const [row] = await listNotifications(db, customer.id)
    expect(row.merchantName).toBe('بقالة الريان')
    expect(row.amountHalalas).toBe(riyalsToHalalas(120))
    expect(row.awaitingApproval).toBe(true)
  })
})

describe('the count on the bell', () => {
  it('counts what has not been read, and opening the list clears it', async () => {
    const person = await makeUser(db)
    const connection = await makeConnection(db, { customerUserId: person.id })

    for (const _ of [1, 2]) {
      await announce(db, [
        {
          userId: person.id,
          kind: 'connection.requested',
          subjectId: connection.id,
        },
      ])
    }
    expect(await countUnread(db, person.id)).toBe(2)

    await markAllRead(db, person.id)

    expect(await countUnread(db, person.id)).toBe(0)
    // Read, not gone: the list still holds them.
    expect(await listNotifications(db, person.id)).toHaveLength(2)
  })

  it('counts only the rows addressed to this person', async () => {
    const mine = await makeUser(db)
    const theirs = await makeUser(db)
    const connection = await makeConnection(db, { customerUserId: theirs.id })

    await announce(db, [
      {
        userId: theirs.id,
        kind: 'connection.requested',
        subjectId: connection.id,
      },
    ])

    expect(await countUnread(db, mine.id)).toBe(0)
  })
})

describe('an operation answered from the list', () => {
  it('is answered once, and the line says so', async () => {
    const merchant = await makeMerchant(db)
    const customer = await makeUser(db)
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
      termsAcceptedAt: new Date(),
    })

    const recorded = await recordPendingPurchase(db, {
      connectionId: connection.id,
      merchantId: merchant.id,
      amountHalalas: riyalsToHalalas(50),
      requestId: 'from-the-list',
    })
    if (!recorded.ok) throw new Error('the purchase should have been recorded')

    const [before] = await listNotifications(db, customer.id)
    expect(before.awaitingApproval).toBe(true)

    await declineOperation(db, {
      transactionId: recorded.transactionId,
      customerUserId: customer.id,
    })

    const [after] = await listNotifications(db, customer.id)
    expect(after.actedAt).not.toBeNull()
    expect(after.awaitingApproval).toBe(false)

    // And the second press finds nothing left to answer.
    expect(
      await declineOperation(db, {
        transactionId: recorded.transactionId,
        customerUserId: customer.id,
      }),
    ).toBe(false)
  })
})

describe('a date that comes round on its own', () => {
  it('is noticed once per date, however often the screen looks', async () => {
    const merchant = await makeMerchant(db)
    const customer = await makeUser(db)
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
    })
    const at = new Date('2026-07-01T09:00:00Z')
    await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(300),
      dueAt: dueDateFor(at, 30),
      createdAt: at,
    })

    // Long past the due date by now.
    const now = new Date('2026-09-01T09:00:00Z')
    const summaries = await listCustomerConnections(db, customer.id, now)
    expect(
      await noticeDueDates(db, { userId: customer.id, summaries, now }),
    ).toBe(1)
    expect(
      await noticeDueDates(db, { userId: customer.id, summaries, now }),
    ).toBe(0)

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, customer.id))
    expect(rows).toHaveLength(1)
    expect(rows[0].kind).toBe('overdue')
  })

  it('says nothing about an account with nothing owing on it', async () => {
    const customer = await makeUser(db)
    const connection = await makeConnection(db, {
      customerUserId: customer.id,
    })
    const at = new Date('2026-07-01T09:00:00Z')
    const purchase = await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(300),
      dueAt: dueDateFor(at, 30),
      createdAt: at,
    })
    await makeTransaction(db, {
      connectionId: connection.id,
      kind: 'payment',
      amountHalalas: riyalsToHalalas(300),
      createdAt: at,
    })
    await db
      .update(transactions)
      .set({ status: 'applied' })
      .where(eq(transactions.id, purchase.id))

    const now = new Date('2026-09-01T09:00:00Z')
    const summaries = await listCustomerConnections(db, customer.id, now)
    expect(
      await noticeDueDates(db, { userId: customer.id, summaries, now }),
    ).toBe(0)
  })
})

/**
 * #78: the clock's round of the ledger, which is what notices a date now that
 * no screen does. Both people it concerns are told, and a customer who never
 * opens the app is one of them.
 */
describe('sweeping for dates that came round', () => {
  const at = new Date('2026-07-01T09:00:00Z')
  const later = new Date('2026-09-01T09:00:00Z')

  async function anOverdueAccount() {
    const shopkeeper = await makeUser(db, { name: 'صاحب المتجر' })
    const merchant = await makeMerchant(db, { ownerUserId: shopkeeper.id })
    const customer = await makeUser(db, { name: 'العميل' })
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
    })
    await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(300),
      dueAt: dueDateFor(at, 30),
      createdAt: at,
    })
    return { shopkeeper, customer, connection }
  }

  it('tells the customer and the shop, without either of them looking', async () => {
    const { shopkeeper, customer } = await anOverdueAccount()

    expect(await sweepDueDates(db, later)).toBe(2)

    for (const person of [customer, shopkeeper]) {
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, person.id))
      expect(rows).toHaveLength(1)
      expect(rows[0].kind).toBe('overdue')
    }
  })

  it('writes the same date once however often it is swept', async () => {
    await anOverdueAccount()

    expect(await sweepDueDates(db, later)).toBe(2)
    expect(await sweepDueDates(db, later)).toBe(0)
    expect(await sweepDueDates(db, later)).toBe(0)
  })

  it('says nothing about a date that has not come round yet', async () => {
    await anOverdueAccount()

    // The purchase is a day old and its date is a month off.
    expect(await sweepDueDates(db, new Date('2026-07-02T09:00:00Z'))).toBe(0)
  })

  it('leaves out an account with nothing owed on it', async () => {
    const { connection } = await anOverdueAccount()
    await makeTransaction(db, {
      connectionId: connection.id,
      kind: 'payment',
      amountHalalas: riyalsToHalalas(300),
      createdAt: at,
    })

    expect(await sweepDueDates(db, later)).toBe(0)
  })

  it('has nothing to say about an empty ledger', async () => {
    expect(await sweepDueDates(db, later)).toBe(0)
  })
})
