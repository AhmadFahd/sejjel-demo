import { databaseConfigFromEnv } from './db/client'
import {
  providerConfigFromEnv,
  assertProductionSafe,
} from './providers/registry'

/**
 * Runs before the server does, as part of `npm start`. Production with a fake
 * OTP sender or gateway is worse than production that will not start.
 */
const providers = providerConfigFromEnv()
assertProductionSafe(providers)

const database = databaseConfigFromEnv()
if (providers.isProduction && !database.url.startsWith('libsql://')) {
  throw new Error(
    `Refusing to start in production against ${database.url}: production is Turso`,
  )
}

if (providers.isProduction && !process.env.AUTH_SECRET) {
  throw new Error('Refusing to start in production without AUTH_SECRET')
}

console.log(
  `Preflight passed: db=${database.url.split(':')[0]} otp=${providers.otp} ` +
    `payments=${providers.payments} storage=${providers.storage} push=${providers.push}`,
)
