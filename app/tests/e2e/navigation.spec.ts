import { expect, signIn, test } from './fixtures'

/** أحمد owes three shops and keeps none, so he lands on the customer side. */
const CUSTOMER = { typed: '0550123456', e164: '+966550123456' }

/** بقالة الريان, whose log has something to search. */
const MERCHANT = { typed: '0550111222', e164: '+966550111222' }

/** Long enough that the wait is real, short enough not to slow the suite. */
const SLOW_MS = 800

async function holdTheServer(page: Parameters<typeof signIn>[0]) {
  await page.route('**/_serverFn/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SLOW_MS))
    await route.continue()
  })
}

/**
 * #76: one stream for the app, not one per screen. The card used to mount its
 * own on top of the one the side's layout already held, which meant two
 * connections, two fallback polls, two server-side sweeps, and every event
 * arriving twice.
 */
test('a customer holds one event stream, on the ledger and on the card', async ({
  page,
}) => {
  const opened: Array<string> = []
  page.on('request', (request) => {
    if (request.url().includes('/api/events')) opened.push(request.url())
  })

  await signIn(page, CUSTOMER.typed, CUSTOMER.e164)
  await expect(page).toHaveURL(/\/customer$/)

  // The stream waits for the document's load event before it opens.
  await expect.poll(() => opened.length).toBe(1)

  await page.getByTestId('my-card-link').click()
  await expect(page.getByTestId('my-card')).toBeVisible()

  // The card is mounted, so a second stream would have opened by now.
  expect(opened).toHaveLength(1)
})

/**
 * #75: nothing rendered a pending state, so a screen whose data was on the
 * way left the old one frozen. The card is a screen that only reads, so the
 * app's loader stands in for it, the bar says so from the first moment, and
 * the dock does not go anywhere while either happens.
 */
test('the loader stands in for a screen on its way, and the dock stays put', async ({
  page,
}) => {
  await signIn(page, CUSTOMER.typed, CUSTOMER.e164)
  await expect(page).toHaveURL(/\/customer$/)

  // A dock item is an anchor, so a tap before the client router exists is an
  // ordinary document navigation: the server renders the next screen and
  // nothing pends. That window is real and worth its own measurement; it is
  // not what this test is about.
  await page.waitForFunction(() => '__TSR_ROUTER__' in window)

  // Hold the server functions long enough for the loader to be worth showing.
  // A navigation that answers inside 150ms shows nothing, which is the point
  // of the delay in `router.tsx` and cannot be tested by racing it.
  await holdTheServer(page)

  await page.getByTestId('my-card-link').click()

  // The bar comes up while the first round trip is still out, which is the
  // part a pending component cannot reach.
  await expect(page.getByTestId('loading-bar')).toBeVisible()
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('dock')).toBeVisible()

  await expect(page.getByTestId('my-card')).toBeVisible()
  await expect(page.getByTestId('loading')).toBeHidden()
  await expect(page.getByTestId('loading-bar')).toBeHidden()
})

/**
 * #75: a screen that carries an operation in its own state gets the bar and
 * nothing else. The loader would unmount it, and the shop would lose the
 * purchase it was halfway through recording.
 */
test('recording a purchase keeps what was typed while the screen waits', async ({
  page,
}) => {
  await signIn(page, MERCHANT.typed, MERCHANT.e164)
  await page.getByTestId('record').click()
  await page.waitForFunction(() => '__TSR_ROUTER__' in window)

  await page.getByLabel('العميل').selectOption({ label: 'أحمد محمد' })
  await page.getByLabel('المبلغ').fill('75')

  // A stream event, or anything else that reloads this screen, must not take
  // the operation with it.
  await holdTheServer(page)
  await page.evaluate(() => {
    const router = (
      window as unknown as { __TSR_ROUTER__: { invalidate: () => void } }
    ).__TSR_ROUTER__
    router.invalidate()
  })

  await expect(page.getByTestId('loading-bar')).toBeVisible()
  await expect(page.getByTestId('loading')).toHaveCount(0)
  await expect(page.getByLabel('المبلغ')).toHaveValue('75')
  await expect(page.getByRole('button', { name: 'أرسل للعميل' })).toBeEnabled()
})

/**
 * #75, the other half: a search is typed into the screen, and a new search is
 * a new set of loader deps, which is a new match. Standing the loader in
 * front of it would unmount the field mid-word. The log holds the loader back
 * and says it is working beside the field instead.
 */
test('the log keeps its rows and its keyboard while it searches', async ({
  page,
}) => {
  await signIn(page, MERCHANT.typed, MERCHANT.e164)
  await page.goto('/merchant/log')
  await page.waitForFunction(() => '__TSR_ROUTER__' in window)
  await expect(page.getByTestId('log-search')).toBeVisible()

  await holdTheServer(page)
  await page.getByTestId('log-search').fill('0550 123 456')

  await expect(page.getByTestId('loading-dots')).toBeVisible()
  await expect(page.getByTestId('loading')).toHaveCount(0)
  await expect(page.getByTestId('log-search')).toBeFocused()

  // And the answer lands on the screen that stayed.
  await expect(page.getByTestId('loading-dots')).toBeHidden()
  await expect(page.getByTestId('log-search')).toHaveValue('0550 123 456')
})
