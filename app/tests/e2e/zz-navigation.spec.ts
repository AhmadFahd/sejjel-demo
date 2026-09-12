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
 * A dock item is an anchor, so a tap before the client router exists is an
 * ordinary document navigation and nothing here is in play. That window is
 * real and worth its own measurement (#74); it is not what these tests are
 * about.
 */
async function hydrated(page: Parameters<typeof signIn>[0]) {
  await page.waitForFunction(() => '__TSR_ROUTER__' in window)
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
 * #79: a tap inside a side costs one round trip, the screen's own. The entry
 * read — who is asking, what is unread, whether they belong here — used to be
 * a second one in front of it, on every navigation, because it sat in a
 * `beforeLoad` and `beforeLoad` keeps nothing.
 *
 * #80: and the way back costs none, because the ledger's answer is half a
 * minute old at most and nothing has said it moved. The card is the other
 * kind: its code is minted by the read, so every visit pays for a new one and
 * none of them is painted from the last visit.
 */
test('a tap inside a side costs one round trip, and the way back costs none', async ({
  page,
}) => {
  await signIn(page, CUSTOMER.typed, CUSTOMER.e164)
  await expect(page).toHaveURL(/\/customer$/)
  await hydrated(page)

  const calls: Array<string> = []
  page.on('request', (request) => {
    if (request.url().includes('/_serverFn/')) calls.push(request.url())
  })

  await page.getByTestId('my-card-link').click()
  await expect(page.getByTestId('my-card')).toBeVisible()
  expect(calls).toHaveLength(1)

  // Back to a screen the router still holds, inside its window: nothing to
  // ask, so the rows are simply there.
  calls.length = 0
  await page.getByTestId('dock').getByText('دفتري').click()
  await expect(page.getByTestId('connection-row').first()).toBeVisible()
  expect(calls).toHaveLength(0)

  // And the card again, which is never the screen that was left.
  calls.length = 0
  await page.getByTestId('dock').getByText('بطاقتي').click()
  await expect(page.getByTestId('my-card')).toBeVisible()
  expect(calls).toHaveLength(1)
})

/**
 * #75: nothing said anything while a screen was on its way, so the app looked
 * frozen. The bar says it, from the first round trip onwards, and the screen
 * a person is looking at stays where it is until the next one is ready.
 */
test('a slow navigation says so, and takes nothing away', async ({ page }) => {
  await signIn(page, CUSTOMER.typed, CUSTOMER.e164)
  await expect(page).toHaveURL(/\/customer$/)
  await hydrated(page)

  await holdTheServer(page)
  await page.getByTestId('my-card-link').click()

  await expect(page.getByTestId('loading-bar')).toBeVisible()
  // The ledger is still there, dock and all, rather than a blank panel.
  await expect(page.getByTestId('dock')).toBeVisible()
  await expect(page.getByTestId('my-card-link')).toBeVisible()

  await expect(page.getByTestId('my-card')).toBeVisible()
  await expect(page.getByTestId('loading-bar')).toBeHidden()
})

/**
 * #75: the screen that carries an operation in its own state keeps it. This
 * is the regression a pending component caused, and the reason there is none.
 */
test('recording a purchase keeps what was typed while the screen waits', async ({
  page,
}) => {
  await signIn(page, MERCHANT.typed, MERCHANT.e164)
  await page.getByTestId('record').click()
  await hydrated(page)

  await page.getByLabel('العميل').selectOption({ label: 'أحمد محمد' })
  await page.getByLabel('المبلغ').fill('75')

  // A stream event, or anything else that reloads this screen, must not take
  // the half-recorded operation with it.
  await holdTheServer(page)
  await page.evaluate(() => {
    const router = (
      window as unknown as { __TSR_ROUTER__: { invalidate: () => void } }
    ).__TSR_ROUTER__
    router.invalidate()
  })

  // Nothing is drawn for this one, and that is right: a reload behind a
  // screen that is already up blocks nobody, so there is nothing to say. What
  // matters is that the operation is still here afterwards.
  await expect(page.getByLabel('المبلغ')).toHaveValue('75')
  await expect(page.getByRole('button', { name: 'أرسل للعميل' })).toBeEnabled()
  await expect(page.getByTestId('loading')).toHaveCount(0)
})

/**
 * #75: where the wait belongs to one part of a screen, the dots say it in
 * place. The search is typed into this screen, so nothing about it may move.
 */
test('the log keeps its rows and its keyboard while it searches', async ({
  page,
}) => {
  await signIn(page, MERCHANT.typed, MERCHANT.e164)
  await page.goto('/merchant/log')
  await hydrated(page)
  await expect(page.getByTestId('log-search')).toBeVisible()

  await holdTheServer(page)
  await page.getByTestId('log-search').fill('0550 123 456')

  await expect(page.getByTestId('loading-dots')).toBeVisible()
  await expect(page.getByTestId('log-search')).toBeFocused()

  // And the answer lands on the screen that stayed.
  await expect(page.getByTestId('loading-dots')).toBeHidden()
  await expect(page.getByTestId('log-search')).toHaveValue('0550 123 456')
})
