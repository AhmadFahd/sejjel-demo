import { test as base } from '@playwright/test'
import type { Browser, BrowserContext } from '@playwright/test'

/**
 * The app asks Google Fonts for Cairo. Nothing under test depends on it, but
 * a machine with no way out to the internet leaves that request hanging, and
 * a pending stylesheet holds the document's load event open — so every
 * navigation waits for a font nobody is looking at. Refuse it at the browser.
 */
const WEBFONTS = /fonts\.(googleapis|gstatic)\.com/

export async function refuseWebfonts(context: BrowserContext) {
  await context.route(WEBFONTS, (route) => route.abort())
}

/** A second phone: its own context, with the same refusal in place. */
export async function openPhone(browser: Browser) {
  const context = await browser.newContext()
  await refuseWebfonts(context)
  return { context, page: await context.newPage() }
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await refuseWebfonts(context)
    await use(context)
  },
})

export { expect } from '@playwright/test'
