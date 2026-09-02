import { createDatabase, databaseConfigFromEnv } from './client'
import { migrateDatabase } from './migrate'

const config = databaseConfigFromEnv()
await migrateDatabase(createDatabase(config))
console.log(`Migrated ${config.url}`)
