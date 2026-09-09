import { getTableName, sql } from 'drizzle-orm'
import { migrateDatabase } from './migrate'
import { DEFAULT_SCENARIO, SCENARIOS, isEmpty } from './seed/registry'
import { schema } from './schema'
import type { Database } from './client'

export type DeployReport = {
  migrated: boolean
  rebuilt: boolean
  seeded: string | null
  reason: string
}

export type DeployOptions = {
  isProduction: boolean
  scenario?: string
  /** Off in production, where a schema conflict is a person's problem. */
  allowRebuild?: boolean
  log?: (message: string) => void
}

/**
 * A migration that lands on tables it did not create. It happens when a
 * database was built from a migration history that has since been rewritten,
 * which is the state every throwaway database ends up in eventually.
 */
function isSchemaConflict(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /already exists/i.test(message)
}

/** Every table this app owns, plus the ledger Drizzle keeps of its own work. */
async function dropEverything(db: Database) {
  const tables = [
    ...Object.values(schema).map((table) => getTableName(table)),
    '__drizzle_migrations',
  ]

  await db.run(sql`PRAGMA foreign_keys = OFF`)
  for (const table of tables) {
    await db.run(sql.raw(`DROP TABLE IF EXISTS "${table}"`))
  }
  await db.run(sql`PRAGMA foreign_keys = ON`)
}

/**
 * What runs before a new version takes traffic: bring the schema up to date,
 * repair it if it cannot be, and put the fixture in an empty database so a
 * fresh environment is worth opening.
 *
 * Everything here is safe to run on every deploy. A database with people in it
 * is migrated and left alone.
 */
export async function prepareForDeploy(
  db: Database,
  options: DeployOptions,
): Promise<DeployReport> {
  const log = options.log ?? console.log
  const allowRebuild = options.allowRebuild ?? !options.isProduction
  let rebuilt = false

  try {
    await migrateDatabase(db)
  } catch (error) {
    if (!isSchemaConflict(error) || !allowRebuild) throw error

    // The alternative is a deploy that can never succeed without someone
    // opening a database console, which is not a state to leave a preview in.
    log(
      'The schema does not match the migrations and this is not production. Rebuilding it.',
    )
    await dropEverything(db)
    await migrateDatabase(db)
    rebuilt = true
  }

  if (options.isProduction) {
    return {
      migrated: true,
      rebuilt,
      seeded: null,
      reason: 'production is never seeded',
    }
  }

  if (!(await isEmpty(db))) {
    return {
      migrated: true,
      rebuilt,
      seeded: null,
      reason: 'the database already has people in it',
    }
  }

  const name = options.scenario ?? DEFAULT_SCENARIO
  const scenario = SCENARIOS.get(name)
  if (!scenario) {
    throw new Error(
      `No scenario named ${name}. Try: ${[...SCENARIOS.keys()].join(', ')}`,
    )
  }

  await scenario.run(db)
  return {
    migrated: true,
    rebuilt,
    seeded: scenario.name,
    reason: 'the database was empty',
  }
}
