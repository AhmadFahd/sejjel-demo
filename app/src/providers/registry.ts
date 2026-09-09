import { createLoggingOtpSender } from './otp-log'
import { createFakePaymentGateway } from './payments-fake'
import { createDiskStorage } from './storage-disk'
import { createLoggingPushSender } from './push-log'
import type { Providers } from './types'

export type * from './types'

export type ProviderNames = {
  otp: string
  payments: string
  storage: string
  push: string
}

/**
 * Which providers are fakes. Storage on disk is not one of them: it is the
 * real implementation in every environment, only pointed at a different
 * directory (see #13).
 */
const FAKES = new Set(['log', 'fake'])

export type ProviderConfig = {
  otp: string
  payments: string
  storage: string
  push: string
  storageRoot: string
  /**
   * The deployment, not the build. A preview and the browser tests run a
   * production build without being production, and keep the fakes.
   */
  appEnv: string
  isProduction: boolean
}

export function providerConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ProviderConfig {
  const appEnv = env.APP_ENV ?? env.NODE_ENV ?? 'development'
  return {
    otp: env.OTP_PROVIDER ?? 'log',
    payments: env.PAYMENTS_PROVIDER ?? 'fake',
    storage: env.STORAGE_PROVIDER ?? 'disk',
    push: env.PUSH_PROVIDER ?? 'log',
    storageRoot: env.STORAGE_ROOT ?? './storage/invoices',
    appEnv,
    isProduction: appEnv === 'production',
  }
}

/**
 * Production must not run on a fake OTP sender, gateway or push sender: a code
 * nobody receives and a payment nobody made are worse than an outage.
 */
export function assertProductionSafe(config: ProviderConfig) {
  if (!config.isProduction) return

  const faked = (['otp', 'payments', 'push'] as const).filter((key) =>
    FAKES.has(config[key]),
  )

  if (faked.length > 0) {
    throw new Error(
      `Refusing to start in production with fake providers: ${faked.join(', ')}`,
    )
  }
}

export function createProviders(config: ProviderConfig): Providers {
  assertProductionSafe(config)

  const providers: Providers = {
    otp:
      config.otp === 'log'
        ? createLoggingOtpSender()
        : unknown('OTP_PROVIDER', config.otp),
    payments:
      config.payments === 'fake'
        ? createFakePaymentGateway()
        : unknown('PAYMENTS_PROVIDER', config.payments),
    storage:
      config.storage === 'disk'
        ? createDiskStorage(config.storageRoot)
        : unknown('STORAGE_PROVIDER', config.storage),
    push:
      config.push === 'log'
        ? createLoggingPushSender()
        : unknown('PUSH_PROVIDER', config.push),
  }

  return providers
}

function unknown(variable: string, value: string): never {
  throw new Error(`${variable}=${value} names a provider that does not exist`)
}

let cached: Providers | undefined

export function getProviders(): Providers {
  cached ??= createProviders(providerConfigFromEnv())
  return cached
}
