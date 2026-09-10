import { createDatabase, databaseConfigFromEnv } from './db/client'
import { prepareForDeploy } from './db/deploy'
import { fixedOtpFromEnv } from './auth/phone'
import { describeStartupProblems } from './lib/startup'
import { describeError, log } from './lib/log'
import { providerConfigFromEnv } from './providers/registry'

/**
 * Runs before the server, every time it starts.
 *
 * It used to be only a check, with the database prepared by the host's
 * pre-deploy hook. That hook is a setting on somebody's dashboard, and when it
 * does not run the app comes up against a schema that is not there and answers
 * five hundred to everything. Doing it here means the app cannot start against
 * a database it has not prepared.
 */
const providers = providerConfigFromEnv()
const database = databaseConfigFromEnv()

const FAKES = new Set(['log', 'fake'])
const fakeProviders = (['otp', 'payments', 'push'] as const).filter((key) =>
  FAKES.has(providers[key]),
)

const problems = describeStartupProblems({
  appEnv: providers.appEnv,
  databaseUrl: database.url,
  authSecret: process.env.AUTH_SECRET,
  fakeProviders,
  fixedOtpCode: fixedOtpFromEnv(),
})

if (problems.length > 0) {
  log.error(`Refusing to start in ${providers.appEnv}`, { problems })
  process.exit(1)
}

try {
  const report = await prepareForDeploy(createDatabase(database), {
    isProduction: providers.isProduction,
    scenario: process.env.SEED_SCENARIO,
    log: (message) => log.warn(message),
  })

  log.info('Database ready', {
    env: providers.appEnv,
    driver: database.url.split(':')[0],
    rebuilt: report.rebuilt,
    seeded: report.seeded,
    reason: report.reason,
  })
} catch (error) {
  log.error(
    'The database could not be prepared, so the server will not start',
    {
      error: describeError(error),
    },
  )
  process.exit(1)
}

log.info('Preflight passed', {
  env: providers.appEnv,
  otp: providers.otp,
  payments: providers.payments,
  storage: providers.storage,
  push: providers.push,
})
