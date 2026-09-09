import { parseArgs } from 'node:util'
import { createDatabase, databaseConfigFromEnv } from './client'
import { migrateDatabase } from './migrate'
import {
  DEFAULT_SCENARIO,
  SCENARIOS,
  applyScenario,
  reset,
} from './seed/registry'

/**
 * `npm run db:seed` puts a named situation into the database.
 *
 *   npm run db:seed                        the prototype's fixture
 *   npm run db:seed -- --scenario empty    a shop with no customers
 *   npm run db:seed -- --reset             replace whatever is there
 *   npm run db:seed -- --list              what there is to choose from
 *
 * It refuses to touch production: seeded data in a real ledger is worse than
 * no data at all.
 */
const { values } = parseArgs({
  options: {
    scenario: { type: 'string', short: 's', default: DEFAULT_SCENARIO },
    reset: { type: 'boolean', default: false },
    list: { type: 'boolean', default: false },
    'reset-only': { type: 'boolean', default: false },
  },
})

if (values.list) {
  for (const scenario of SCENARIOS.values()) {
    console.log(`${scenario.name.padEnd(10)} ${scenario.description}`)
  }
  process.exit(0)
}

const config = databaseConfigFromEnv()
if (config.url.startsWith('libsql://')) {
  throw new Error('The seed is for development and previews, not production')
}

const db = createDatabase(config)
await migrateDatabase(db)

if (values['reset-only']) {
  await reset(db)
  console.log('Emptied every table.')
} else {
  const scenario = await applyScenario(db, values.scenario, {
    reset: values.reset,
  })
  console.log(`Seeded "${scenario.name}": ${scenario.description}`)
}
