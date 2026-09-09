import { sql } from 'drizzle-orm'
import { empty } from './scenarios/empty'
import { poc } from './scenarios/poc'
import { schema } from '../schema'
import type { Database } from '../client'
import type { Scenario } from './types'

/** A Map, so a lookup by an arbitrary name is typed as the miss it can be. */
export const SCENARIOS = new Map<string, Scenario>([
  [poc.name, poc],
  [empty.name, empty],
])

export const DEFAULT_SCENARIO = poc.name

/** Every table, children before parents, so the deletes never trip a foreign key. */
const TABLES_IN_DELETION_ORDER = [
  schema.events,
  schema.notifications,
  schema.paymentLinks,
  schema.transactions,
  schema.invoices,
  schema.connections,
  schema.merchants,
  schema.sessions,
  schema.accounts,
  schema.verifications,
  schema.users,
]

export async function isEmpty(db: Database) {
  const row = (
    await db.select({ count: sql<number>`count(*)` }).from(schema.users)
  ).at(0)
  return Number(row?.count ?? 0) === 0
}

/** Only ever called against a development or preview database. */
export async function reset(db: Database) {
  for (const table of TABLES_IN_DELETION_ORDER) {
    await db.delete(table)
  }
}

export async function applyScenario(
  db: Database,
  name: string,
  options: { reset?: boolean } = {},
) {
  const scenario = SCENARIOS.get(name)
  if (!scenario) {
    throw new Error(
      `No scenario named ${name}. Try: ${[...SCENARIOS.keys()].join(', ')}`,
    )
  }

  if (options.reset) await reset(db)
  else if (!(await isEmpty(db))) {
    throw new Error(
      'The database already has people in it. Pass --reset to replace them.',
    )
  }

  await scenario.run(db)
  return scenario
}
