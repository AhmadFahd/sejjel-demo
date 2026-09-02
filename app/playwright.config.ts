import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 3100)
const baseURL = `http://127.0.0.1:${port}`

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
    command: 'npm run build && npm start',
    url: baseURL,
    env: { PORT: String(port), NODE_ENV: 'production' },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
