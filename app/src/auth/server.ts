import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { phoneNumber } from 'better-auth/plugins'
import { getDatabase } from '#/db/client'
import { accounts, sessions, users, verifications } from '#/db/schema'
import { getProviders, providerConfigFromEnv } from '#/providers/registry'
import { log } from '#/lib/log'
import { SAUDI_MOBILE, fixedOtpFromEnv } from './phone'

/** Five minutes is long enough to read an SMS and short enough to be worth stealing. */
const OTP_TTL_SECONDS = 300

/** Six wrong codes and the number has to ask for a new one. */
const ALLOWED_ATTEMPTS = 5

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

/**
 * Better Auth builds absolute links from this. Railway names the public
 * hostname for us, so an unset APP_URL does not have to mean a warning on
 * every request.
 */
function baseUrlFromEnv() {
  if (process.env.APP_URL) return process.env.APP_URL

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN
  return railway ? `https://${railway}` : undefined
}

let cached: ReturnType<typeof createAuth> | undefined

function createAuth() {
  const fixedCode = fixedOtpFromEnv()

  if (fixedCode) {
    log.warn('Every sign-in on this deployment accepts one fixed code', {
      reason: 'OTP_FIXED_CODE is set',
    })
  }

  return betterAuth({
    appName: 'sejjel',
    baseURL: baseUrlFromEnv(),
    secret: process.env.AUTH_SECRET,
    database: drizzleAdapter(getDatabase(), {
      provider: 'sqlite',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    session: { expiresIn: SESSION_TTL_SECONDS },
    /**
     * Better Auth's own logger writes multi-line objects, which a log pipeline
     * reads as one entry per line. Send it through ours instead.
     */
    logger: {
      level: 'warn',
      log: (level, message, ...args) => {
        const fields = args.length > 0 ? { details: args } : undefined
        if (level === 'error') log.error(message, fields)
        else if (level === 'warn') log.warn(message, fields)
        else log.info(message, fields)
      },
    },
    /**
     * A proxy sets one of these; which one depends on the host. Without a
     * client address every caller shares one rate-limit bucket, which turns a
     * limit meant for one number into a limit on everybody.
     */
    advanced: {
      ipAddress: {
        ipAddressHeaders: [
          'x-forwarded-for',
          'x-real-ip',
          'x-client-ip',
          'cf-connecting-ip',
          'x-envoy-external-address',
        ],
      },
    },
    rateLimit: {
      /**
       * Off in the browser tests, which come from one address and would spend
       * the budget on each other rather than on anything worth limiting.
       */
      enabled: providerConfigFromEnv().appEnv !== 'test',
      customRules: {
        // Asking for codes is the cheap half of an SMS bill and the loud half
        // of an attack.
        '/phone-number/send-otp': { window: 300, max: 3 },
        '/phone-number/verify': { window: 300, max: 10 },
      },
    },
    /**
     * Email and password exist in the core model, not in this app. Nobody can
     * sign in with them.
     */
    emailAndPassword: { enabled: false },
    plugins: [
      phoneNumber({
        expiresIn: OTP_TTL_SECONDS,
        allowedAttempts: ALLOWED_ATTEMPTS,
        phoneNumberValidator: (value) => SAUDI_MOBILE.test(value),
        sendOTP: async ({ phoneNumber: to, code }) => {
          // With a fixed code configured, send that one: a log that disagrees
          // with what the screen accepts is worse than no log at all.
          await getProviders().otp.send({
            phoneNumber: to,
            code: fixedCode ?? code,
          })
        },
        /**
         * Replaces the generated code entirely, rather than sitting beside it,
         * so there is one answer to what will be accepted. Refused in
         * production by the startup check.
         */
        ...(fixedCode
          ? { verifyOTP: ({ code }: { code: string }) => code === fixedCode }
          : {}),
        /**
         * No `signUpOnVerification`: a number nobody has connected to a shop
         * gets no account. Accounts are created by the handshake (#38), not by
         * whoever can receive an SMS.
         */
      }),
    ],
  })
}

export function getAuth() {
  cached ??= createAuth()
  return cached
}
