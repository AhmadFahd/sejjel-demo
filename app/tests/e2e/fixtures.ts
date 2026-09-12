import { readFileSync } from 'node:fs'
import { expect as check, test as base } from '@playwright/test'
import { OTP_LOG } from '../../playwright.config'
import type { Browser, BrowserContext, Page } from '@playwright/test'

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

/** The fake OTP sender writes every code it "sends" to a file. */
function codeSentTo(phoneNumber: string): string {
  const lines = readFileSync(OTP_LOG, 'utf8').trim().split('\n')
  const line = lines.reverse().find((entry) => entry.startsWith(phoneNumber))
  if (!line) throw new Error(`No code was sent to ${phoneNumber}`)
  return line.split(' ')[1]
}

/**
 * Waits for the client to take over the document, which `__root.tsx` says with
 * `data-hydrated`.
 *
 * Every screen arrives as HTML before its handlers exist, and in that window a
 * dock item is an ordinary anchor and a field is a field React has not adopted
 * yet: a fill lands and is then thrown away by the hydrating render, a button
 * press does nothing at all. Every unrepeatable failure this suite has had was
 * that window, so nothing here touches a screen until it is over.
 */
export async function hydrated(page: Page) {
  await page.locator('html[data-hydrated="true"]').waitFor()
}

/** A whole new document, waited out. */
export async function go(page: Page, path: string) {
  await page.goto(path)
  await hydrated(page)
}

/** The same document again, which is as new as any other. */
export async function reload(page: Page) {
  await page.reload()
  await hydrated(page)
}

/**
 * Signed in and wherever their roles send them. The number is typed the way a
 * person types it and read back in the form the sender logs.
 */
export async function signIn(page: Page, typed: string, e164: string) {
  await go(page, '/sign-in')
  await page.getByLabel('رقم الجوال').fill(typed)
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()

  await check(page.getByTestId('code-boxes')).toBeVisible()
  await page.getByLabel('الرقم 1').click()
  await page.keyboard.type(codeSentTo(e164))

  // The session lands with the navigation, so a goto before this races it —
  // and the screen it lands on is a new document of its own to wait out.
  await check(page).not.toHaveURL(/\/sign-in$/)
  await hydrated(page)
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await refuseWebfonts(context)
    await use(context)
  },
})

export { expect } from '@playwright/test'
