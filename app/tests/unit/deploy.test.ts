import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDatabase } from '#/db/client'
import { prepareForDeploy } from '#/db/deploy'
import { isEmpty } from '#/db/seed/registry'
import { listMerchantConnections } from '#/db/queries/ledger'
import { merchants, users } from '#/db/schema'
import { createTestDatabase } from '../support/database'
import { makeMerchant } from '../support/factories'
import type { Database } from '#/db/client'

const quiet = () => {}

describe('prepareForDeploy', () => {
  let db: Database

  beforeEach(async () => {
    db = await createTestDatabase()
  })

  it('seeds an empty database, so a fresh environment is worth opening', async () => {
    const report = await prepareForDeploy(db, {
      isProduction: false,
      log: quiet,
    })

    expect(report.seeded).toBe('poc')
    const [riyan] = await db.select().from(merchants)
    expect(await listMerchantConnections(db, riyan.id)).toHaveLength(3)
  })

  it('takes the scenario it is given', async () => {
    const report = await prepareForDeploy(db, {
      isProduction: false,
      scenario: 'empty',
      log: quiet,
    })

    expect(report.seeded).toBe('empty')
  })

  it('leaves a database that already has people in it alone', async () => {
    await makeMerchant(db)

    const report = await prepareForDeploy(db, {
      isProduction: false,
      log: quiet,
    })

    expect(report.seeded).toBeNull()
    expect(report.reason).toMatch(/already has people/)
    expect(await db.select().from(users)).toHaveLength(1)
  })

  it('never seeds production, however empty it is', async () => {
    const report = await prepareForDeploy(db, {
      isProduction: true,
      log: quiet,
    })

    expect(report.seeded).toBeNull()
    expect(report.reason).toMatch(/production/)
    expect(await isEmpty(db)).toBe(true)
  })

  it('says so when the scenario has no such name', async () => {
    await expect(
      prepareForDeploy(db, {
        isProduction: false,
        scenario: 'nope',
        log: quiet,
      }),
    ).rejects.toThrow(/poc, empty/)
  })
})

describe('a schema the migrations cannot land on', () => {
  /**
   * What a database looks like after the migration history was rewritten: the
   * tables are there, the record of how they got there is not.
   */
  async function databaseFromAForgottenHistory() {
    const db = createDatabase({ url: ':memory:' })
    await db.run(sql`CREATE TABLE "users" ("id" text PRIMARY KEY)`)
    return db
  }

  it('rebuilds it outside production, rather than failing every deploy', async () => {
    const db = await databaseFromAForgottenHistory()

    const report = await prepareForDeploy(db, {
      isProduction: false,
      log: quiet,
    })

    expect(report.rebuilt).toBe(true)
    expect(report.seeded).toBe('poc')
    // The rebuilt table is the real one, not the stub it replaced.
    const people = await db.select().from(users)
    expect(people.length).toBeGreaterThan(0)
    expect(people[0].phoneNumber).toMatch(/^\+966/)
  })

  it('refuses to rebuild production, where the data is somebody real', async () => {
    const db = await databaseFromAForgottenHistory()

    await expect(
      prepareForDeploy(db, { isProduction: true, log: quiet }),
    ).rejects.toThrow(/already exists/i)
  })
})
