import { createDatabase } from '#/db/client'
import { migrateDatabase } from '#/db/migrate'

/**
 * A database per test: in memory, with the real migrations applied, so a test
 * fails when a migration is wrong rather than when a hand-written table is.
 */
export async function createTestDatabase() {
  const db = createDatabase({ url: ':memory:' })
  await migrateDatabase(db)
  return db
}
