import { databaseConfigFromEnv } from './db/client'
import { describeStartupProblems } from './lib/startup'
import { providerConfigFromEnv } from './providers/registry'

/**
 * Runs before the server does, as part of `npm start`. Anything wrong here is
 * wrong for every request, so it is better said once at boot than five hundred
 * times a minute afterwards.
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
})

if (problems.length > 0) {
  throw new Error(
    `Refusing to start in ${providers.appEnv}:\n  - ${problems.join('\n  - ')}`,
  )
}

console.log(
  `Preflight passed: env=${providers.appEnv} db=${database.url.split(':')[0]} ` +
    `otp=${providers.otp} payments=${providers.payments} ` +
    `storage=${providers.storage} push=${providers.push}`,
)
