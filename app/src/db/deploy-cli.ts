import { createDatabase, databaseConfigFromEnv } from './client'
import { prepareForDeploy } from './deploy'
import { providerConfigFromEnv } from '#/providers/registry'
import { log } from '#/lib/log'

/**
 * The pre-deploy step. Migrates, repairs a schema that cannot be migrated
 * anywhere but production, and seeds a database that is still empty.
 *
 * SEED_SCENARIO picks what an empty environment gets; the default is the
 * prototype's fixture.
 */
const config = databaseConfigFromEnv()
const { isProduction, appEnv } = providerConfigFromEnv()

const report = await prepareForDeploy(createDatabase(config), {
  isProduction,
  scenario: process.env.SEED_SCENARIO,
  log: (message) => log.warn(message),
})

log.info('Database ready', {
  env: appEnv,
  rebuilt: report.rebuilt,
  seeded: report.seeded,
  reason: report.reason,
})
