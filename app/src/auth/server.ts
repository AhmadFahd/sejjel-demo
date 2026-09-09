import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { phoneNumber } from 'better-auth/plugins'
import { getDatabase } from '#/db/client'
import { accounts, sessions, users, verifications } from '#/db/schema'
import { getProviders, providerConfigFromEnv } from '#/providers/registry'
import { SAUDI_MOBILE } from './phone'

/** Five minutes is long enough to read an SMS and short enough to be worth stealing. */
const OTP_TTL_SECONDS = 300

/** Six wrong codes and the number has to ask for a new one. */
const ALLOWED_ATTEMPTS = 5

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

let cached: ReturnType<typeof createAuth> | undefined

function createAuth() {
  return betterAuth({
    appName: 'sejjel',
    baseURL: process.env.APP_URL,
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
     * Railway terminates TLS and sets x-forwarded-for, so the last hop is the
     * one to believe. Without this every caller shares one rate-limit bucket,
     * which turns a limit meant for one number into a limit on everybody.
     */
    advanced: { ipAddress: { ipAddressHeaders: ['x-forwarded-for'] } },
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
          await getProviders().otp.send({ phoneNumber: to, code })
        },
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
