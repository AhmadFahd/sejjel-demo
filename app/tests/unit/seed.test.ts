import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '#/db/client'
import {
  DEFAULT_SCENARIO,
  SCENARIOS,
  applyScenario,
  isEmpty,
  reset,
} from '#/db/seed/registry'
import {
  listCustomerConnections,
  listMerchantConnections,
} from '#/db/queries/ledger'
import { merchants, users } from '#/db/schema'
import { riyalsToHalalas } from '#/lib/money'
import { PAYDAY_WEEKDAY, riyadhWeekday } from '#/lib/payday'
import { eq } from 'drizzle-orm'
import { createTestDatabase } from '../support/database'

let db: Database

beforeEach(async () => {
  db = await createTestDatabase()
})

describe('scenarios', () => {
  it('puts the prototype fixture from POC.md into the ledger', async () => {
    await applyScenario(db, 'poc')

    const [riyan] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.name, 'بقالة الريان'))
    const rows = await listMerchantConnections(db, riyan.id)
    const balances = Object.fromEntries(
      rows.map((row) => [row.customerName, row.balanceHalalas]),
    )

    expect(balances).toEqual({
      'أحمد محمد': riyalsToHalalas(800),
      'خالد علي': 0,
      'سالم العتيبي': riyalsToHalalas(1250),
    })

    const salem = rows.find((row) => row.customerName === 'سالم العتيبي')
    expect(salem?.limitHalalas).toBe(riyalsToHalalas(1500))
  })

  it('dates the fixture from the seed, so its states hold as time passes', async () => {
    await applyScenario(db, 'poc')

    const [riyan] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.name, 'بقالة الريان'))
    const rows = await listMerchantConnections(db, riyan.id)
    const byName = Object.fromEntries(
      rows.map((row) => [row.customerName, row]),
    )

    // Every due date the rule produced is a Tuesday, whenever the seed ran.
    for (const row of rows) {
      if (row.dueAt) expect(riyadhWeekday(row.dueAt)).toBe(PAYDAY_WEEKDAY)
    }

    expect(byName['أحمد محمد'].status).toBe('open')
    expect(byName['خالد علي'].status).toBe('settled')
    expect(byName['سالم العتيبي'].status).toBe('overdue')
  })

  it('gives أحمد the two other shops he owes', async () => {
    await applyScenario(db, 'poc')

    const [ahmed] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, '+966550123456'))
    const shops = await listCustomerConnections(db, ahmed.id)

    expect(shops.map((row) => row.merchantName).sort()).toEqual([
      'بقالة الريان',
      'سوق النور',
      'مخبز الضحى',
    ])
  })

  it('includes a person on neither side of the ledger', async () => {
    await applyScenario(db, 'poc')

    const [noura] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, '+966500000001'))

    expect(noura).toBeDefined()
    expect(await listCustomerConnections(db, noura.id)).toEqual([])
  })

  it('verifies every seeded number, so a seeded person can sign in', async () => {
    await applyScenario(db, 'poc')

    const people = await db.select().from(users)
    expect(people.every((person) => person.phoneNumberVerified)).toBe(true)
  })

  it('leaves a new shop with no customers', async () => {
    await applyScenario(db, 'empty')

    const [shop] = await db.select().from(merchants)
    expect(await listMerchantConnections(db, shop.id)).toEqual([])
  })

  it('refuses to seed over people who are already there', async () => {
    await applyScenario(db, 'poc')

    await expect(applyScenario(db, 'poc')).rejects.toThrow(/--reset/)
  })

  it('replaces what is there when asked to', async () => {
    await applyScenario(db, 'poc')
    await applyScenario(db, 'empty', { reset: true })

    const people = await db.select().from(users)
    expect(people).toHaveLength(1)
  })

  it('says so when the scenario has no such name', async () => {
    await expect(applyScenario(db, 'nope')).rejects.toThrow(/poc, empty/)
  })

  it('empties every table on reset', async () => {
    await applyScenario(db, 'poc')
    await reset(db)

    expect(await isEmpty(db)).toBe(true)
  })

  it('names a default that exists', () => {
    expect(SCENARIOS.get(DEFAULT_SCENARIO)).toBeDefined()
  })
})
