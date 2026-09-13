import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import type { Browser, BrowserContext, Page } from '@playwright/test'

/**
 * Every screenshot in the two user manuals, taken in one pass over a freshly
 * seeded ledger so the figures on one slide agree with the figures on the
 * next. The pass spends the fixture as it goes — it records an operation,
 * approves it, takes a payment, burns a payment link — so reseed before each
 * run:
 *
 *   npm run build
 *   npm run db:seed -- --reset
 *   PORT=3200 NODE_ENV=production node .output/server/index.mjs   # one shell
 *   npm run screenshots                                          # another
 *
 * The server needs `OTP_FIXED_CODE` set to the code below, which is what a
 * deployment with no SMS provider runs on anyway.
 *
 * Chromium is told to resolve the deployed host to that local server, so the
 * screens that print the app's own address — the invite line on the scan
 * screen, the WhatsApp message, the QR codes — read the way they do in the
 * demo rather than saying 127.0.0.1. `SHOTS_HOST` overrides that name, and
 * `SHOTS_SERVER` where it resolves to.
 */

const HOST = process.env.SHOTS_HOST ?? 'sejjel-demo-production.up.railway.app'
const SERVER = process.env.SHOTS_SERVER ?? '127.0.0.1:3200'
const BASE = `http://${HOST}`
const CODE = process.env.SHOTS_CODE ?? '000000'
const PROXY = process.env.SHOTS_PROXY ?? process.env.HTTPS_PROXY ?? ''

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../manual/public/shots',
)

/** A phone, which is the only shape these screens are drawn for. */
const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'ar-SA',
  ignoreHTTPSErrors: true,
}

async function hydrated(page: Page) {
  await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 25_000 })
}

async function go(page: Page, path: string) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await hydrated(page)
  await page.waitForTimeout(450)
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(450)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(name)
}

/** Signed in and wherever their roles send them. */
async function signIn(page: Page, typed: string) {
  await go(page, '/sign-in')
  await page.getByLabel('رقم الجوال').fill(typed)
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()
  await page.getByTestId('code-boxes').waitFor()
  await page.getByLabel('الرقم 1').click()
  await page.keyboard.type(CODE)
  await page.waitForURL((url) => !url.pathname.endsWith('/sign-in'), {
    timeout: 25_000,
  })
  await hydrated(page)
  await page.waitForTimeout(600)
}

/** A second phone: its own context, so it carries its own session. */
async function openPhone(browser: Browser): Promise<[BrowserContext, Page]> {
  const context = await browser.newContext(PHONE)
  return [context, await context.newPage()]
}

/** The way in, on a phone nobody has signed in on. */
async function theWayIn(browser: Browser) {
  const [context, page] = await openPhone(browser)
  await go(page, '/')
  await shot(page, 'landing')

  await go(page, '/sign-in')
  await page.getByLabel('رقم الجوال').fill('0550111222')
  await shot(page, 'signin-phone')

  await page.getByRole('button', { name: 'أرسل الرمز' }).click()
  await page.getByTestId('code-boxes').waitFor()
  await page.getByLabel('الرقم 1').click()
  // Four of the six, so the screen is caught mid-code rather than signing in
  // under the camera.
  await page.keyboard.type('0000')
  await shot(page, 'signin-code')
  await context.close()
}

/** The shop as it is found, before this pass moves anything. */
async function theShop(shop: Page) {
  await shot(shop, 'm-home')

  // The customer list, which is what the states slide is about.
  await shop.evaluate(() => window.scrollTo({ top: 760, behavior: 'instant' }))
  await shop.waitForTimeout(700)
  await shot(shop, 'm-customers')

  await go(shop, '/merchant/qr')
  await shot(shop, 'm-counter-qr')
  await go(shop, '/merchant/log')
  await shot(shop, 'm-log')
  await go(shop, '/merchant/settings')
  await shot(shop, 'm-settings')
  await go(shop, '/merchant/scan')
  await shot(shop, 'm-scan')
}

/** One customer's account, its terms, and the link that collects on it. */
async function oneAccount(shop: Page) {
  await go(shop, '/merchant')
  await shop.getByText('أحمد محمد').first().click()
  await hydrated(shop)
  await shop.waitForTimeout(600)
  await shot(shop, 'm-account')
  const account = new URL(shop.url()).pathname

  await shop.getByTestId('customer-settings').click()
  await hydrated(shop)
  await shop.waitForTimeout(600)
  await shot(shop, 'm-customer-terms')

  await go(shop, account)
  await shop.getByTestId('share-link').click()
  await shop.getByTestId('link-sheet').waitFor()
  await shot(shop, 'm-payment-link')
}

/** An operation, from the counter and from the phone across it. */
async function anOperation(browser: Browser, shop: Page) {
  await go(shop, '/merchant/record')
  await shop.getByLabel('العميل').selectOption({ label: 'خالد علي' })
  await shop.getByLabel('المبلغ').fill('150')
  await shop.getByLabel('الوصف (اختياري)').fill('مشتريات اليوم')
  await shot(shop, 'm-record')
  await shop.getByRole('button', { name: 'أرسل للعميل' }).click()
  await shop.getByTestId('waiting').waitFor()
  await shot(shop, 'm-waiting')

  const [context, customer] = await openPhone(browser)
  await signIn(customer, '0555987210')
  await shot(customer, 'c-home-awaiting')
  await customer.getByTestId('awaiting').first().click()
  await hydrated(customer)
  await shot(customer, 'c-approve')
  await customer.getByRole('button', { name: 'موافقة' }).click()
  await customer.getByTestId('approval-code').waitFor()
  await customer.waitForTimeout(1000)
  await shot(customer, 'c-approval-code')
  const code = (await customer.getByTestId('approval-text').innerText()).trim()

  // The camera cannot open in here, so the code goes in the way a shop whose
  // camera will not open puts it in.
  await go(shop, '/merchant/scan')
  await shop.locator('#scan-code').fill(code)
  await shop.getByRole('button', { name: 'تسجيل' }).click()
  await shop.getByTestId('applied').waitFor({ timeout: 20_000 })
  await shot(shop, 'm-applied')

  // The bell has something in it now: the operation that just landed on this
  // customer's ledger.
  await go(customer, '/customer/notifications')
  await shot(customer, 'c-notifications')
  await context.close()
}

/** What the counter refuses, and what it only warns about. */
async function theLimit(shop: Page) {
  await go(shop, '/merchant/record')
  await shop.getByLabel('العميل').selectOption({ label: 'سالم العتيبي' })
  await shop.getByLabel('المبلغ').fill('300')
  await shop.getByRole('button', { name: 'أرسل للعميل' }).click()
  await shop.getByTestId('refusal').waitFor()
  await shot(shop, 'm-over-limit')

  await shop.getByLabel('المبلغ').fill('100')
  await shop.getByRole('button', { name: 'أرسل للعميل' }).click()
  await shop.getByTestId('refusal').waitFor()
  await shot(shop, 'm-overdue-warning')
}

/** The customer's side: أحمد, who owes three shops and settles one. */
async function theLedger(browser: Browser) {
  const [context, page] = await openPhone(browser)
  await signIn(page, '0550123456')
  await shot(page, 'c-home')

  await go(page, '/customer/card')
  await page.getByTestId('approval-text').waitFor({ timeout: 20_000 })
  await shot(page, 'c-card')

  await go(page, '/customer')
  await page.getByText('مخبز الضحى').first().click()
  await hydrated(page)
  await page.waitForTimeout(600)
  await shot(page, 'c-account')

  await page.getByRole('link', { name: 'سداد' }).first().click()
  await hydrated(page)
  await page.waitForTimeout(600)
  // A part of it rather than the whole: the receipt prints the amount the
  // screen last worked out, and on a whole settlement that figure is the
  // balance, which the payment has just taken to zero.
  await page.getByRole('button', { name: 'مبلغ جزئي' }).click()
  await page.getByLabel('المبلغ').fill('200')
  await page.getByTestId('method-mada').click()
  await page.waitForTimeout(250)
  await shot(page, 'c-pay')
  await page.locator('button', { hasText: 'ادفع' }).first().click()
  await page.getByTestId('receipt').waitFor({ timeout: 25_000 })
  await shot(page, 'c-paid')
  await context.close()
}

/** A phone no shop has connected yet, and the shop asking for it. */
async function aNewPhone(browser: Browser, shop: Page) {
  const [context, page] = await openPhone(browser)
  await signIn(page, '0500000001')
  await shot(page, 'c-welcome')

  await go(page, '/customer/card')
  await page.getByTestId('approval-text').waitFor({ timeout: 20_000 })
  const card = (await page.getByTestId('approval-text').innerText()).trim()

  await go(shop, '/merchant/scan')
  await shop.locator('#scan-code').fill(card)
  await shop.getByRole('button', { name: 'تسجيل' }).click()
  await shop.getByTestId('connect-outcome').waitFor({ timeout: 20_000 })
  await shot(shop, 'm-asked')

  await go(page, '/customer/card')
  await page.waitForTimeout(900)
  await shot(page, 'c-request')
  await context.close()
}

/** The payment link, opened by somebody with no app and no account. */
async function theLink(browser: Browser, shop: Page) {
  await go(shop, '/merchant')
  await shop.getByText('سالم العتيبي').first().click()
  await hydrated(shop)
  await shop.getByTestId('share-link').click()
  await shop.getByTestId('link-sheet').waitFor()
  const message = await shop.getByTestId('link-sheet').innerText()
  const url = message.match(/https?:\/\/\S+/)?.[0]
  if (!url) throw new Error('The link sheet carried no link')

  const [context, page] = await openPhone(browser)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await hydrated(page)
  await shot(page, 'w-pay')
  // The method button on this page is the payment: there is no second press.
  await page.getByTestId('web-mada').click()
  await page.getByTestId('web-paid').waitFor({ timeout: 25_000 })
  await shot(page, 'w-paid')
  await context.close()
}

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  // The same preinstalled Chromium the browser suite prefers, where there is
  // one.
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  // These screens ask Google Fonts for Cairo, and the manual is not worth
  // taking in a fallback face — so on a machine that reaches the internet
  // through a proxy, the browser goes through it too. The app's own host is
  // resolved locally and never touches it.
  ...(PROXY
    ? { proxy: { server: PROXY, bypass: `127.0.0.1,localhost,${HOST}` } }
    : {}),
  args: [
    `--host-resolver-rules=MAP ${HOST} ${SERVER}`,
    // That host is served over plain http here, and a page that is not a
    // secure context has no `crypto.randomUUID` — which the record screen
    // calls on every operation.
    `--unsafely-treat-insecure-origin-as-secure=${BASE}`,
  ],
})

await theWayIn(browser)

const [shopContext, shop] = await openPhone(browser)
await signIn(shop, '0550111222')
await theShop(shop)
await oneAccount(shop)
await anOperation(browser, shop)
await theLimit(shop)
await theLedger(browser)
await aNewPhone(browser, shop)
await theLink(browser, shop)

// Last, because the bell is only worth a picture once the pass has given it
// something to hold.
await go(shop, '/merchant/notifications')
await shot(shop, 'm-notifications')

await shopContext.close()
await browser.close()
console.log(`\n${OUT}`)
