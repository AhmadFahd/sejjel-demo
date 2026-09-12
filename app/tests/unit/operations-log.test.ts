import { beforeEach, describe, expect, it } from 'vitest'
import {
  LOG_PAGE_SIZE,
  listShopOperations,
  shopHasOperations,
} from '#/db/queries/log'
import { invoices } from '#/db/schema'
import { riyalsToHalalas } from '#/lib/money'
import { createTestDatabase } from '../support/database'
import {
  makeConnection,
  makeMerchant,
  makeTransaction,
  makeUser,
} from '../support/factories'
import type { Database } from '#/db/client'

let db: Database

beforeEach(async () => {
  db = await createTestDatabase()
})

/** A shop with two customers on it, the way the prototype's fixture has it. */
async function aShopWithTwoCustomers() {
  const merchant = await makeMerchant(db, { name: 'بقالة الريان' })
  const ahmed = await makeUser(db, {
    name: 'أحمد محمد',
    phoneNumber: '+966550123456',
  })
  const salem = await makeUser(db, {
    name: 'سالم العتيبي',
    phoneNumber: '+966533456789',
  })

  return {
    merchant,
    ahmed,
    salem,
    ahmedAt: await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: ahmed.id,
    }),
    salemAt: await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: salem.id,
    }),
  }
}

const at = (iso: string) => new Date(iso)

describe('listShopOperations', () => {
  it('reads one shop’s operations newest first, and nobody else’s', async () => {
    const shop = await aShopWithTwoCustomers()
    await makeTransaction(db, {
      connectionId: shop.ahmedAt.id,
      kind: 'purchase',
      amountHalalas: riyalsToHalalas(1000),
      description: 'مشتريات',
      createdAt: at('2026-08-20T09:00:00Z'),
    })
    await makeTransaction(db, {
      connectionId: shop.ahmedAt.id,
      kind: 'payment',
      amountHalalas: riyalsToHalalas(200),
      createdAt: at('2026-08-27T09:00:00Z'),
    })
    await makeTransaction(db, {
      connectionId: shop.salemAt.id,
      kind: 'purchase',
      status: 'pending',
      amountHalalas: riyalsToHalalas(1250),
      createdAt: at('2026-08-24T09:00:00Z'),
    })

    // Another shop's ledger, which this one must not be able to read.
    const elsewhere = await makeConnection(db)
    await makeTransaction(db, { connectionId: elsewhere.id })

    const { entries, hasMore } = await listShopOperations(db, {
      merchantId: shop.merchant.id,
    })

    expect(hasMore).toBe(false)
    expect(
      entries.map((entry) => [
        entry.customerName,
        entry.kind,
        entry.status,
        entry.amountHalalas,
      ]),
    ).toEqual([
      ['أحمد محمد', 'payment', 'applied', riyalsToHalalas(200)],
      ['سالم العتيبي', 'purchase', 'pending', riyalsToHalalas(1250)],
      ['أحمد محمد', 'purchase', 'applied', riyalsToHalalas(1000)],
    ])
    expect(entries[2].description).toBe('مشتريات')
    expect(entries[2].connectionId).toBe(shop.ahmedAt.id)
  })

  it('carries the invoice behind an operation where there is one', async () => {
    const shop = await aShopWithTwoCustomers()
    const [invoice] = await db
      .insert(invoices)
      .values({
        storageKey: 'invoices/receipt.png',
        contentType: 'image/png',
        byteSize: 68,
        uploadedByUserId: shop.merchant.ownerUserId,
      })
      .returning()
    await makeTransaction(db, {
      connectionId: shop.ahmedAt.id,
      invoiceId: invoice.id,
    })
    await makeTransaction(db, { connectionId: shop.salemAt.id })

    const { entries } = await listShopOperations(db, {
      merchantId: shop.merchant.id,
    })

    expect(entries.map((entry) => entry.invoiceId).filter(Boolean)).toEqual([
      invoice.id,
    ])
  })

  it('finds a customer by part of their name', async () => {
    const shop = await aShopWithTwoCustomers()
    await makeTransaction(db, { connectionId: shop.ahmedAt.id })
    await makeTransaction(db, { connectionId: shop.salemAt.id })

    const { entries } = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      search: 'سالم',
    })

    expect(entries.map((entry) => entry.customerName)).toEqual(['سالم العتيبي'])
  })

  /**
   * The ledger keeps `+966550123456` and the row above the search box reads
   * `0550 123 456`. Somebody searching copies whichever is in front of them,
   * so both have to find the same person.
   */
  it('finds a mobile however it was typed', async () => {
    const shop = await aShopWithTwoCustomers()
    await makeTransaction(db, { connectionId: shop.ahmedAt.id })
    await makeTransaction(db, { connectionId: shop.salemAt.id })

    for (const typed of [
      '0550 123 456',
      '0550123456',
      '+966550123456',
      '966550123456',
      '550123456',
      '123456',
    ]) {
      const { entries } = await listShopOperations(db, {
        merchantId: shop.merchant.id,
        search: typed,
      })
      expect(entries.map((entry) => entry.customerName)).toEqual(['أحمد محمد'])
    }

    const { entries } = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      search: '0500000000',
    })
    expect(entries).toEqual([])
  })

  it('treats a wildcard as a letter somebody typed', async () => {
    const shop = await aShopWithTwoCustomers()
    await makeTransaction(db, { connectionId: shop.ahmedAt.id })

    const { entries } = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      search: '%',
    })

    expect(entries).toEqual([])
  })

  it('narrows to one kind', async () => {
    const shop = await aShopWithTwoCustomers()
    await makeTransaction(db, {
      connectionId: shop.ahmedAt.id,
      kind: 'purchase',
    })
    await makeTransaction(db, {
      connectionId: shop.ahmedAt.id,
      kind: 'payment',
    })
    await makeTransaction(db, {
      connectionId: shop.salemAt.id,
      kind: 'purchase',
    })

    const { entries } = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      kind: 'payment',
    })

    expect(entries.map((entry) => entry.kind)).toEqual(['payment'])
  })

  /**
   * A day is a day in Riyadh, not in UTC: the three hours between them are
   * the difference between an operation at nine in the evening being on the
   * day it was recorded and being on the day after.
   */
  it('takes the whole of the day at each end of the range', async () => {
    const shop = await aShopWithTwoCustomers()
    const moments = {
      dayBefore: '2026-09-08T20:59:59Z',
      firstMoment: '2026-09-08T21:00:00Z',
      lastMoment: '2026-09-09T20:59:59Z',
      dayAfter: '2026-09-09T21:00:00Z',
    }
    for (const [name, iso] of Object.entries(moments)) {
      await makeTransaction(db, {
        connectionId: shop.ahmedAt.id,
        description: name,
        createdAt: at(iso),
      })
    }

    const oneDay = new Date('2026-09-09T00:00:00Z')
    const { entries } = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      from: oneDay,
      to: oneDay,
    })

    expect(entries.map((entry) => entry.description)).toEqual([
      'lastMoment',
      'firstMoment',
    ])
  })

  it('opens a range at one end and leaves the other open', async () => {
    const shop = await aShopWithTwoCustomers()
    for (const iso of [
      '2026-09-01T09:00:00Z',
      '2026-09-09T09:00:00Z',
      '2026-09-17T09:00:00Z',
    ]) {
      await makeTransaction(db, {
        connectionId: shop.ahmedAt.id,
        description: iso,
        createdAt: at(iso),
      })
    }

    const since = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      from: new Date('2026-09-09T00:00:00Z'),
    })
    const until = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      to: new Date('2026-09-09T00:00:00Z'),
    })

    expect(since.entries).toHaveLength(2)
    expect(until.entries).toHaveLength(2)
  })

  /**
   * The page is known to have a next one because a row beyond it was asked
   * for, not because everything behind it was counted.
   */
  it('pages, and says whether there is another page', async () => {
    const shop = await aShopWithTwoCustomers()
    const total = LOG_PAGE_SIZE + 2
    for (let index = 0; index < total; index += 1) {
      await makeTransaction(db, {
        connectionId: shop.ahmedAt.id,
        description: `عملية ${index}`,
        createdAt: new Date(Date.UTC(2026, 8, 1, 9) + index * 60_000),
      })
    }

    const first = await listShopOperations(db, { merchantId: shop.merchant.id })
    const second = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      page: 2,
    })

    expect(first.entries).toHaveLength(LOG_PAGE_SIZE)
    expect(first.hasMore).toBe(true)
    expect(first.entries[0].description).toBe(`عملية ${total - 1}`)

    expect(second.entries).toHaveLength(2)
    expect(second.hasMore).toBe(false)
    expect(second.entries.at(-1)?.description).toBe('عملية 0')
  })

  it('reads a page before the first as the first', async () => {
    const shop = await aShopWithTwoCustomers()
    await makeTransaction(db, { connectionId: shop.ahmedAt.id })

    const { entries } = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      page: 0,
    })

    expect(entries).toHaveLength(1)
  })

  it('takes the search and the filters together', async () => {
    const shop = await aShopWithTwoCustomers()
    await makeTransaction(db, {
      connectionId: shop.ahmedAt.id,
      kind: 'purchase',
      createdAt: at('2026-09-09T09:00:00Z'),
    })
    await makeTransaction(db, {
      connectionId: shop.ahmedAt.id,
      kind: 'payment',
      createdAt: at('2026-09-09T10:00:00Z'),
    })
    await makeTransaction(db, {
      connectionId: shop.ahmedAt.id,
      kind: 'payment',
      createdAt: at('2026-09-20T10:00:00Z'),
    })
    await makeTransaction(db, {
      connectionId: shop.salemAt.id,
      kind: 'payment',
      createdAt: at('2026-09-09T11:00:00Z'),
    })

    const { entries } = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      search: 'أحمد',
      kind: 'payment',
      from: new Date('2026-09-09T00:00:00Z'),
      to: new Date('2026-09-09T00:00:00Z'),
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].customerName).toBe('أحمد محمد')
    expect(entries[0].kind).toBe('payment')
  })
})

describe('shopHasOperations', () => {
  /**
   * The two empty screens say different things — one is a shop that has not
   * started, the other a search that missed — and only the database can tell
   * which of them an empty page is.
   */
  it('tells a shop with nothing in it from a search that found nothing', async () => {
    const shop = await aShopWithTwoCustomers()
    const quiet = await makeMerchant(db, { name: 'بقالة هادئة' })
    await makeConnection(db, { merchantId: quiet.id })
    await makeTransaction(db, { connectionId: shop.ahmedAt.id })

    const missed = await listShopOperations(db, {
      merchantId: shop.merchant.id,
      search: 'لا أحد',
    })

    expect(missed.entries).toEqual([])
    expect(await shopHasOperations(db, shop.merchant.id)).toBe(true)
    expect(await shopHasOperations(db, quiet.id)).toBe(false)
  })

  it('reads a shop nobody is connected to as empty', async () => {
    const alone = await makeMerchant(db)

    expect(await shopHasOperations(db, alone.id)).toBe(false)
  })
})
