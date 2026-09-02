import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { schema } from './schema'

export type Database = ReturnType<typeof createDatabase>

export type DatabaseConfig = {
  /** `file:./sejjel.db` in development and previews, `libsql://…` in production. */
  url: string
  authToken?: string
}

export function createDatabase(config: DatabaseConfig) {
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  })
  return drizzle(client, { schema, casing: 'snake_case' })
}

export function databaseConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseConfig {
  const url = env.DATABASE_URL ?? 'file:./sejjel.db'
  const authToken = env.DATABASE_AUTH_TOKEN

  if (url.startsWith('libsql://') && !authToken) {
    throw new Error('DATABASE_AUTH_TOKEN is required for a libsql:// database')
  }

  return { url, authToken }
}

let cached: Database | undefined

/** One connection per process. Railway runs one instance; see #13. */
export function getDatabase(): Database {
  cached ??= createDatabase(databaseConfigFromEnv())
  return cached
}
