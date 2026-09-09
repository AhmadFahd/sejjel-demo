import { createDatabase, databaseConfigFromEnv } from './client'
import { prepareForDeploy } from './deploy'
import { providerConfigFromEnv } from '#/providers/registry'

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
})

console.log(
  [
    `Database ready for ${appEnv}:`,
    report.rebuilt ? 'schema rebuilt,' : 'migrated,',
    report.seeded
      ? `seeded "${report.seeded}"`
      : `not seeded (${report.reason})`,
  ].join(' '),
)
