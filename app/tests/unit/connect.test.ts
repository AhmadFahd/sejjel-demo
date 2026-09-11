import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '#/db/client'
import {
  answerConnectionRequest,
  connectByIdentity,
  listConnectionRequests,
} from '#/db/queries/connect'
import { listMerchantConnections } from '#/db/queries/ledger'
import { eventsSince } from '#/db/queries/events'
import { APPROVAL_SECONDS, issueIdentity } from '#/lib/approval.server'
import { riyalsToHalalas } from '#/lib/money'
import { createTestDatabase } from '../support/database'
import { makeConnection, makeMerchant, makeUser } from '../support/factories'

let db: Database

beforeEach(async () => {
  db = await createTestDatabase()
})

async function shopAndStranger() {
  const owner = await makeUser(db)
  const merchant = await makeMerchant(db, {
    ownerUserId: owner.id,
    defaultLimitHalalas: riyalsToHalalas(750),
    defaultTermDays: 21,
  })
  const customer = await makeUser(db, { name: 'نورة الحربي' })
  return { owner, merchant, customer }
}

describe('connecting by scanning a card', () => {
  it('asks, rather than adds: nothing is in the shop’s list yet', async () => {
    const { merchant, customer } = await shopAndStranger()

    const result = await connectByIdentity(db, {
      code: issueIdentity(customer.id),
      merchantId: merchant.id,
    })

    expect(result).toMatchObject({ ok: true, already: false, waiting: true })
    expect(await listMerchantConnections(db, merchant.id)).toHaveLength(0)

    const [event] = await eventsSince(db, customer.id, 0)
    expect(event.kind).toBe('connection.requested')
  })

  it('takes the shop’s limit and term when the customer agrees', async () => {
    const { merchant, customer } = await shopAndStranger()
    const asked = await connectByIdentity(db, {
      code: issueIdentity(customer.id),
      merchantId: merchant.id,
    })
    if (!asked.ok) throw new Error('the shop could not ask')

    expect(
      await answerConnectionRequest(db, {
        connectionId: asked.connectionId,
        customerUserId: customer.id,
        agree: true,
      }),
    ).toBe(true)

    const [row] = await listMerchantConnections(db, merchant.id)
    expect(row.customerName).toBe('نورة الحربي')
    expect(row.limitHalalas).toBe(riyalsToHalalas(750))
    expect(row.termDays).toBe(21)
  })

  it('leaves nothing in the list when the customer refuses', async () => {
    const { merchant, customer } = await shopAndStranger()
    const asked = await connectByIdentity(db, {
      code: issueIdentity(customer.id),
      merchantId: merchant.id,
    })
    if (!asked.ok) throw new Error('the shop could not ask')

    await answerConnectionRequest(db, {
      connectionId: asked.connectionId,
      customerUserId: customer.id,
      agree: false,
    })

    expect(await listMerchantConnections(db, merchant.id)).toHaveLength(0)
    expect(await listConnectionRequests(db, customer.id)).toEqual([])
  })

  it('opens the account of somebody already kept, rather than asking twice', async () => {
    const { merchant, customer } = await shopAndStranger()
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
    })

    const result = await connectByIdentity(db, {
      code: issueIdentity(customer.id),
      merchantId: merchant.id,
    })

    expect(result).toEqual({
      ok: true,
      connectionId: connection.id,
      already: true,
      waiting: false,
    })
  })

  it('refuses a card photographed off a screen and used later', async () => {
    const { merchant, customer } = await shopAndStranger()
    const now = new Date()

    expect(
      await connectByIdentity(db, {
        code: issueIdentity(customer.id, now),
        merchantId: merchant.id,
        now: new Date(now.getTime() + (APPROVAL_SECONDS + 1) * 1000),
      }),
    ).toEqual({ ok: false, problem: 'expired' })
  })

  it('refuses a shopkeeper scanning their own card', async () => {
    const { merchant, owner } = await shopAndStranger()

    expect(
      await connectByIdentity(db, {
        code: issueIdentity(owner.id),
        merchantId: merchant.id,
      }),
    ).toEqual({ ok: false, problem: 'self' })
  })
})

describe('a customer’s requests', () => {
  it('says which shop is asking, and on what terms', async () => {
    const { merchant, customer } = await shopAndStranger()
    await connectByIdentity(db, {
      code: issueIdentity(customer.id),
      merchantId: merchant.id,
    })

    const [request] = await listConnectionRequests(db, customer.id)

    expect(request.merchantId).toBe(merchant.id)
    expect(request.limitHalalas).toBe(riyalsToHalalas(750))
    expect(request.termDays).toBe(21)
  })

  it('is nobody else’s to answer', async () => {
    const { merchant, customer } = await shopAndStranger()
    const stranger = await makeUser(db)
    const asked = await connectByIdentity(db, {
      code: issueIdentity(customer.id),
      merchantId: merchant.id,
    })
    if (!asked.ok) throw new Error('the shop could not ask')

    expect(
      await answerConnectionRequest(db, {
        connectionId: asked.connectionId,
        customerUserId: stranger.id,
        agree: true,
      }),
    ).toBe(false)
  })
})
