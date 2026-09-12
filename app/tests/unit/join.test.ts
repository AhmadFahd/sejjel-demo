import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import type { Database } from '#/db/client'
import { connections } from '#/db/schema'
import { joinShop, readShopFor } from '#/db/queries/join'
import { riyalsToHalalas } from '#/lib/money'
import { safeNextPath } from '#/lib/next-path'
import { createTestDatabase } from '../support/database'
import { makeConnection, makeMerchant, makeUser } from '../support/factories'

let db: Database

beforeEach(async () => {
  db = await createTestDatabase()
})

describe('the shop behind the code on the counter', () => {
  it('says who it is and what it lends on, to anybody', async () => {
    const merchant = await makeMerchant(db, {
      name: 'بقالة الريان',
      defaultLimitHalalas: riyalsToHalalas(1000),
      defaultTermDays: 30,
    })

    const shop = await readShopFor(db, {
      merchantId: merchant.id,
      userId: null,
    })

    expect(shop).toMatchObject({
      name: 'بقالة الريان',
      limitHalalas: riyalsToHalalas(1000),
      termDays: 30,
      connectionId: null,
      joined: false,
    })
  })

  it('is nothing at all for a code naming no shop', async () => {
    expect(
      await readShopFor(db, { merchantId: 'no-such-shop', userId: null }),
    ).toBeNull()
  })

  it('knows somebody it already keeps', async () => {
    const merchant = await makeMerchant(db)
    const customer = await makeUser(db)
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
    })

    const shop = await readShopFor(db, {
      merchantId: merchant.id,
      userId: customer.id,
    })

    expect(shop?.joined).toBe(true)
    expect(shop?.connectionId).toBe(connection.id)
  })
})

describe('joining from the counter', () => {
  it('makes the connection active at once, because nobody is left to ask', async () => {
    const merchant = await makeMerchant(db)
    const customer = await makeUser(db)

    const result = await joinShop(db, {
      merchantId: merchant.id,
      userId: customer.id,
    })
    expect(result).toMatchObject({ ok: true, already: false })

    const [row] = await db
      .select()
      .from(connections)
      .where(eq(connections.customerUserId, customer.id))
    expect(row.status).toBe('active')
    expect(row.termsAcceptedAt).not.toBeNull()
    // The shop's defaults, which is what the null overrides mean.
    expect(row.limitOverrideHalalas).toBeNull()
  })

  it('answers a request the shop had already made', async () => {
    const merchant = await makeMerchant(db)
    const customer = await makeUser(db)
    const asked = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
      status: 'pending',
      termsAcceptedAt: null,
    })

    const result = await joinShop(db, {
      merchantId: merchant.id,
      userId: customer.id,
    })

    // The same connection, agreed to from the other side rather than a second.
    expect(result).toMatchObject({ ok: true, connectionId: asked.id })
    const rows = await db
      .select()
      .from(connections)
      .where(eq(connections.customerUserId, customer.id))
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('active')
  })

  it('opens the account they already have rather than making another', async () => {
    const merchant = await makeMerchant(db)
    const customer = await makeUser(db)
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
    })

    expect(
      await joinShop(db, { merchantId: merchant.id, userId: customer.id }),
    ).toMatchObject({ ok: true, connectionId: connection.id, already: true })
  })

  it('refuses a shopkeeper their own shop, which would be lending to themselves', async () => {
    const merchant = await makeMerchant(db)

    expect(
      await joinShop(db, {
        merchantId: merchant.id,
        userId: merchant.ownerUserId,
      }),
    ).toEqual({ ok: false, problem: 'self' })
  })

  it('refuses a code naming no shop', async () => {
    const customer = await makeUser(db)

    expect(
      await joinShop(db, { merchantId: 'no-such-shop', userId: customer.id }),
    ).toEqual({ ok: false, problem: 'missing' })
  })
})

/** The value arrives in a link somebody else may have written. */
describe('where sign-in is allowed to send somebody afterwards', () => {
  it('keeps a path inside this app', () => {
    expect(safeNextPath('/shop/abc')).toBe('/shop/abc')
  })

  it('drops anywhere else', () => {
    for (const value of [
      '//evil.example',
      'https://evil.example',
      'javascript:alert(1)',
      '/\\evil.example',
      'shop/abc',
      42,
      null,
    ]) {
      expect(safeNextPath(value)).toBeNull()
    }
  })
})
