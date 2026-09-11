import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import type { Database } from '#/db/client'
import { connections, events, notifications } from '#/db/schema'
import { getConnectionSummary } from '#/db/queries/ledger'
import {
  listTermChanges,
  readShopTerms,
  saveCustomerTerms,
  saveShopTerms,
} from '#/db/queries/terms'
import { recordPendingPurchase } from '#/db/queries/purchases'
import {
  describeOverrideProblems,
  describeTermsProblems,
  isBelowBalance,
} from '#/lib/terms'
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

describe('the rules', () => {
  it('holds a shop to a limit and a term it can actually keep', () => {
    expect(describeTermsProblems({ limitRiyals: 1000, termDays: 30 })).toEqual(
      [],
    )
    expect(describeTermsProblems({ limitRiyals: 0, termDays: 30 })).toEqual([
      'limit',
    ])
    expect(
      describeTermsProblems({ limitRiyals: 100_001, termDays: 30 }),
    ).toEqual(['limit'])
    expect(describeTermsProblems({ limitRiyals: 1000, termDays: 91 })).toEqual([
      'term',
    ])
    expect(describeTermsProblems({ limitRiyals: 12.5, termDays: 0 })).toEqual([
      'limit',
      'term',
    ])
  })

  it('treats a cleared override as inheritance, not as an unsound figure', () => {
    expect(
      describeOverrideProblems({ limitRiyals: null, termDays: null }),
    ).toEqual([])
    expect(
      describeOverrideProblems({ limitRiyals: 0, termDays: null }),
    ).toEqual(['limit'])
  })

  it('knows a limit that leaves a customer already over it', () => {
    expect(isBelowBalance(riyalsToHalalas(500), riyalsToHalalas(800))).toBe(
      true,
    )
    expect(isBelowBalance(riyalsToHalalas(800), riyalsToHalalas(800))).toBe(
      false,
    )
  })
})

/** A shop with one customer on the defaults and one with their own figures. */
async function makeShopWithTwo() {
  const merchant = await makeMerchant(db, {
    defaultLimitHalalas: riyalsToHalalas(1000),
    defaultTermDays: 30,
  })
  const inheriting = await makeConnection(db, {
    merchantId: merchant.id,
    customerUserId: (await makeUser(db, { name: 'أحمد محمد' })).id,
  })
  const overridden = await makeConnection(db, {
    merchantId: merchant.id,
    customerUserId: (await makeUser(db, { name: 'سارة علي' })).id,
    limitOverrideHalalas: riyalsToHalalas(5000),
    termOverrideDays: 14,
  })
  return { merchant, inheriting, overridden }
}

describe('the shop defaults', () => {
  it('moves everybody inheriting and leaves an override alone', async () => {
    const { merchant, inheriting, overridden } = await makeShopWithTwo()

    const result = await saveShopTerms(db, {
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitHalalas: riyalsToHalalas(2000),
      termDays: 45,
    })

    expect(result?.moved).toBe(1)
    const moved = await getConnectionSummary(db, inheriting.id)
    expect(moved?.limitHalalas).toBe(riyalsToHalalas(2000))
    expect(moved?.termDays).toBe(45)

    const stayed = await getConnectionSummary(db, overridden.id)
    expect(stayed?.limitHalalas).toBe(riyalsToHalalas(5000))
    expect(stayed?.termDays).toBe(14)
  })

  it('writes what changed, who changed it, and when', async () => {
    const { merchant } = await makeShopWithTwo()
    const at = new Date('2026-09-01T09:00:00Z')

    await saveShopTerms(db, {
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitHalalas: riyalsToHalalas(2000),
      termDays: 30,
      now: at,
    })

    const [change] = await listTermChanges(db, { merchantId: merchant.id })
    expect(change.connectionId).toBeNull()
    expect(change.limitBeforeHalalas).toBe(riyalsToHalalas(1000))
    expect(change.limitAfterHalalas).toBe(riyalsToHalalas(2000))
    expect(change.termBeforeDays).toBe(30)
    expect(change.termAfterDays).toBe(30)
    expect(change.createdAt.getTime()).toBe(at.getTime())
    expect(change.changedByName).toBeTruthy()
  })

  it('tells the customers whose terms moved, and only those', async () => {
    const { merchant, inheriting } = await makeShopWithTwo()

    await saveShopTerms(db, {
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitHalalas: riyalsToHalalas(2000),
      termDays: 30,
    })

    const told = await db.select().from(notifications)
    expect(told).toHaveLength(1)
    expect(told[0].kind).toBe('limit_changed')
    expect(told[0].connectionId).toBe(inheriting.id)

    const announced = await db
      .select()
      .from(events)
      .where(eq(events.kind, 'terms.changed'))
    expect(announced).toHaveLength(1)
  })

  it('tells nobody of a limit that did not move, only of a term that did', async () => {
    const { merchant, inheriting } = await makeShopWithTwo()

    await saveShopTerms(db, {
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitHalalas: riyalsToHalalas(1000),
      termDays: 45,
    })

    // The screens are refreshed, because the due date on the next purchase
    // moved; the limit notification is not sent, because the limit did not.
    const announced = await db
      .select()
      .from(events)
      .where(eq(events.kind, 'terms.changed'))
    expect(announced).toHaveLength(1)
    expect(announced[0].subjectId).toBe(inheriting.id)
    expect(await db.select().from(notifications)).toEqual([])
  })

  it('says nothing when the figures are saved unchanged', async () => {
    const { merchant } = await makeShopWithTwo()

    const result = await saveShopTerms(db, {
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitHalalas: riyalsToHalalas(1000),
      termDays: 30,
    })

    expect(result).toEqual({ moved: 0, overLimit: [] })
    expect(await listTermChanges(db, { merchantId: merchant.id })).toEqual([])
    expect(await db.select().from(notifications)).toEqual([])
  })
})

describe('a customer override', () => {
  it('sets a figure of their own and clearing it returns them to the shop', async () => {
    const { merchant, inheriting } = await makeShopWithTwo()

    await saveCustomerTerms(db, {
      connectionId: inheriting.id,
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitOverrideHalalas: riyalsToHalalas(3000),
      termOverrideDays: 7,
    })
    expect((await getConnectionSummary(db, inheriting.id))?.limitHalalas).toBe(
      riyalsToHalalas(3000),
    )

    await saveCustomerTerms(db, {
      connectionId: inheriting.id,
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitOverrideHalalas: null,
      termOverrideDays: null,
    })

    const [row] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, inheriting.id))
    expect(row.limitOverrideHalalas).toBeNull()
    expect(row.termOverrideDays).toBeNull()

    // Back on the shop's figure, and following it when the shop moves again.
    await saveShopTerms(db, {
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitHalalas: riyalsToHalalas(1500),
      termDays: 30,
    })
    expect((await getConnectionSummary(db, inheriting.id))?.limitHalalas).toBe(
      riyalsToHalalas(1500),
    )
  })

  it('refuses a customer of another shop', async () => {
    const { inheriting } = await makeShopWithTwo()
    const other = await makeMerchant(db)

    const result = await saveCustomerTerms(db, {
      connectionId: inheriting.id,
      merchantId: other.id,
      changedByUserId: other.ownerUserId,
      limitOverrideHalalas: riyalsToHalalas(9000),
      termOverrideDays: null,
    })

    expect(result).toBeNull()
    expect((await getConnectionSummary(db, inheriting.id))?.limitHalalas).toBe(
      riyalsToHalalas(1000),
    )
  })

  it('shows a customer the shop changes that moved them, beside their own', async () => {
    const { merchant, inheriting } = await makeShopWithTwo()

    await saveShopTerms(db, {
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitHalalas: riyalsToHalalas(2000),
      termDays: 30,
    })
    await saveCustomerTerms(db, {
      connectionId: inheriting.id,
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitOverrideHalalas: riyalsToHalalas(3000),
      termOverrideDays: null,
    })

    const changes = await listTermChanges(db, {
      merchantId: merchant.id,
      connectionId: inheriting.id,
    })
    expect(changes).toHaveLength(2)
    expect(changes.map((change) => change.connectionId)).toContain(null)
  })
})

describe('a limit lowered under the balance', () => {
  it('is allowed, named, and stops the next purchase until the balance drops', async () => {
    const { merchant, inheriting } = await makeShopWithTwo()
    await makeTransaction(db, {
      connectionId: inheriting.id,
      kind: 'purchase',
      status: 'applied',
      amountHalalas: riyalsToHalalas(800),
    })

    const result = await saveCustomerTerms(db, {
      connectionId: inheriting.id,
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitOverrideHalalas: riyalsToHalalas(500),
      termOverrideDays: null,
    })

    // Lowered, and the debt is untouched: the shop cannot erase what is owed.
    expect(result?.overLimit).toEqual([
      {
        connectionId: inheriting.id,
        customerName: 'أحمد محمد',
        balanceHalalas: riyalsToHalalas(800),
        limitHalalas: riyalsToHalalas(500),
      },
    ])
    const summary = await getConnectionSummary(db, inheriting.id)
    expect(summary?.balanceHalalas).toBe(riyalsToHalalas(800))
    expect(summary?.availableHalalas).toBe(0)

    const refused = await recordPendingPurchase(db, {
      connectionId: inheriting.id,
      merchantId: merchant.id,
      amountHalalas: riyalsToHalalas(10),
      requestId: 'after-the-lowering',
    })
    expect(refused).toMatchObject({ ok: false, problems: ['limit'] })
  })

  it('names every customer a lowered default leaves over it', async () => {
    const { merchant, inheriting } = await makeShopWithTwo()
    await makeTransaction(db, {
      connectionId: inheriting.id,
      kind: 'purchase',
      status: 'applied',
      amountHalalas: riyalsToHalalas(900),
    })

    const result = await saveShopTerms(db, {
      merchantId: merchant.id,
      changedByUserId: merchant.ownerUserId,
      limitHalalas: riyalsToHalalas(600),
      termDays: 30,
    })

    expect(result?.overLimit.map((row) => row.customerName)).toEqual([
      'أحمد محمد',
    ])
  })
})

describe('readShopTerms', () => {
  it('is nothing for a shop that does not exist', async () => {
    expect(await readShopTerms(db, 'no-such-shop')).toBeNull()
  })
})
