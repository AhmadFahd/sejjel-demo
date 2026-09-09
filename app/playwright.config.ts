import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 3100)
const baseURL = `http://127.0.0.1:${port}`

/** A database and an OTP log of its own, thrown away and rebuilt on each run. */
export const E2E_DATABASE = './.e2e/sejjel-e2e.db'
export const OTP_LOG = './.e2e/otp.log'

/**
 * Some machines carry a Chromium that Playwright did not install itself, at a
 * build number Playwright will not look for. Point at it when it is there, and
 * fall back to Playwright's own download everywhere else, CI included.
 */
const preinstalledChromium =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium'
const launchOptions = existsSync(preinstalledChromium)
  ? { executablePath: preinstalledChromium }
  : {}

/** Runs against a production build, which is the thing that actually ships. */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions } },
  ],
  webServer: {
    command:
      'mkdir -p .e2e && rm -f .e2e/otp.log && npm run build && npm run db:seed -- --reset && npm start',
    url: baseURL,
    // A production build, but not a production deployment: the fakes stay.
    env: {
      PORT: String(port),
      NODE_ENV: 'production',
      APP_ENV: 'test',
      DATABASE_URL: `file:${E2E_DATABASE}`,
      // Where the fake OTP sender writes the codes the sign-in test reads.
      OTP_LOG_FILE: OTP_LOG,
      AUTH_SECRET: 'e2e-secret-not-used-anywhere-else',
      APP_URL: baseURL,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
