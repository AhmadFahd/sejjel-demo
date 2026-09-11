import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '#/db/client'
import { eventsSince, latestEventId, recordEvents } from '#/db/queries/events'
import { announce } from '#/db/queries/ledger-events'
import { onWake } from '#/server/stream.server'
import { recordPendingPurchase } from '#/db/queries/purchases'
import { riyalsToHalalas } from '#/lib/money'
import { createTestDatabase } from '../support/database'
import { makeConnection, makeMerchant, makeUser } from '../support/factories'

let db: Database

beforeEach(async () => {
  db = await createTestDatabase()
})

describe('the event log', () => {
  it('gives one user only what is addressed to them, in order', async () => {
    const mine = await makeUser(db)
    const theirs = await makeUser(db)

    await recordEvents(db, [
      { userId: mine.id, kind: 'purchase.recorded', subjectId: 'first' },
      { userId: theirs.id, kind: 'purchase.recorded', subjectId: 'not-mine' },
      { userId: mine.id, kind: 'purchase.applied', subjectId: 'second' },
    ])

    const events = await eventsSince(db, mine.id, 0)

    expect(events.map((event) => event.subjectId)).toEqual(['first', 'second'])
    expect(events[0].id).toBeLessThan(events[1].id)
  })

  it('replays only what a client has not heard', async () => {
    const user = await makeUser(db)
    const [first] = await recordEvents(db, [
      { userId: user.id, kind: 'purchase.recorded' },
    ])
    await recordEvents(db, [{ userId: user.id, kind: 'purchase.applied' }])

    const missed = await eventsSince(db, user.id, first.id)

    expect(missed).toHaveLength(1)
    expect(missed[0].kind).toBe('purchase.applied')
  })

  it('starts a first-time stream from the latest event, not the beginning', async () => {
    const user = await makeUser(db)
    expect(await latestEventId(db, user.id)).toBe(0)

    const [row] = await recordEvents(db, [
      { userId: user.id, kind: 'payment.received' },
    ])

    expect(await latestEventId(db, user.id)).toBe(row.id)
    expect(await eventsSince(db, user.id, row.id)).toEqual([])
  })

  it('carries no state, only what changed', async () => {
    const user = await makeUser(db)
    await recordEvents(db, [
      { userId: user.id, kind: 'purchase.applied', subjectId: 'tx-1' },
    ])

    const [event] = await eventsSince(db, user.id, 0)

    expect(Object.keys(event).sort()).toEqual(['id', 'kind', 'subjectId'])
  })
})

describe('announce', () => {
  it('writes the row and wakes the stream as one act', async () => {
    const user = await makeUser(db)
    let woken = 0
    const stop = onWake(user.id, () => {
      woken += 1
    })

    await announce(db, [{ userId: user.id, kind: 'connection.requested' }])
    stop()

    expect(woken).toBe(1)
    expect(await eventsSince(db, user.id, 0)).toHaveLength(1)
  })
})

describe('what the ledger announces', () => {
  it('tells the customer about an operation waiting for them', async () => {
    const merchant = await makeMerchant(db, {
      defaultLimitHalalas: riyalsToHalalas(1000),
    })
    const customer = await makeUser(db)
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
    })

    await recordPendingPurchase(db, {
      connectionId: connection.id,
      merchantId: merchant.id,
      amountHalalas: riyalsToHalalas(250),
      requestId: 'told-the-customer',
    })

    const [event] = await eventsSince(db, customer.id, 0)
    expect(event.kind).toBe('purchase.recorded')
  })
})
