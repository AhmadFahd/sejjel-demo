import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/libsql/migrator'
import type { Database } from './client'

export const migrationsFolder = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
)

export async function migrateDatabase(db: Database) {
  await migrate(db, { migrationsFolder })
}
