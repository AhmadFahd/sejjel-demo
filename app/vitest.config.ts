import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Unit tests run without the Start plugins: they exercise modules, not routes.
 * The browser tests are Playwright's, under tests/e2e.
 */
export default defineConfig({
  resolve: {
    alias: {
      '#': fileURLToPath(new URL('./src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // Signing an approval needs a secret, the same way the server does. A
    // fixed one here keeps the tests from depending on the machine.
    env: { AUTH_SECRET: 'a-secret-only-the-tests-use' },
  },
})
