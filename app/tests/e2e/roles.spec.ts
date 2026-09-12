import { readFileSync } from 'node:fs'
import { expect, go, hydrated, openPhone, test } from './fixtures'
import type { Page } from '@playwright/test'
import { OTP_LOG } from '../../playwright.config'

function codeSentTo(phoneNumber: string): string {
  const lines = readFileSync(OTP_LOG, 'utf8').trim().split('\n')
  const line = lines.reverse().find((entry) => entry.startsWith(phoneNumber))
  if (!line) throw new Error(`No code was sent to ${phoneNumber}`)
  return line.split(' ')[1]
}

/**
 * PROTOTYPE (no-app-bar): the dark bar these controls used to sit in is gone,
 * and every variant of that question keeps them behind the profile instead.
 */
async function openProfile(page: Page) {
  await page.getByTestId('profile').click()
}

async function signIn(page: Page, typed: string, e164: string) {
  await go(page, '/sign-in')
  await signInHere(page, typed, e164)
}

/** For a sign-in screen already open, which is carrying where to go next. */
async function signInHere(page: Page, typed: string, e164: string) {
  await page.getByLabel('رقم الجوال').fill(typed)
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()

  // One box at a time, the way a person types it; the last digit signs them in.
  await expect(page.getByTestId('code-boxes')).toBeVisible()
  await page.getByLabel('الرقم 1').click()
  await page.keyboard.type(codeSentTo(e164))

  // The session lands with the navigation, so a goto before this races it —
  // and the screen it lands on is a new document to wait out before anybody
  // touches it.
  await expect(page).not.toHaveURL(/\/sign-in$/)
  await hydrated(page)
}

test('a shopkeeper lands on their shop', async ({ page }) => {
  await signIn(page, '0550111222', '+966550111222')

  await expect(page).toHaveURL(/\/merchant$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'بقالة الريان',
  )
  // The shop's three customers, from the fixture.
  await expect(page.getByText('سالم العتيبي')).toBeVisible()

  // UC-19: the strip names the coming Tuesday, and the states below it are
  // worked out from today rather than stored, so سالم reads as past due.
  const strip = page.getByTestId('payday-strip')
  await expect(strip).toContainText('كل ثلاثاء')
  await expect(strip).toContainText('يوم السداد القادم')
  await expect(
    page.getByTestId('connection-row').filter({ hasText: 'سالم العتيبي' }),
  ).toContainText('تجاوز الموعد')
})

/**
 * UC-02: the figures come from the fixture's three customers — 800 owed, one
 * settled, 1,250 past due — so they are a check that the shop's position is
 * summed in the database rather than added up on the screen.
 */
test('the shop position is on the dashboard', async ({ page }) => {
  await signIn(page, '0550111222', '+966550111222')

  const main = page.locator('main')
  await expect(main).toContainText('2,050')
  await expect(main).toContainText('1,250')
  await expect(page.getByTestId('connection-row')).toHaveCount(3)

  // The operations counter: three purchases and two payments at this shop.
  const counter = page.getByTestId('operations-counter')
  await expect(counter).toContainText('العمليات')
  await expect(counter).toContainText('شراء')
  await expect(counter).toContainText('سداد')

  // Three customers fit on one page, so there is nothing to page through.
  await expect(page.getByTestId('pager')).toHaveCount(0)
})

/**
 * A day as the date fields write it, counted in Riyadh, so a range asked for
 * here means the same days the fixture was seeded against.
 */
function riyadhDay(daysAgo: number): string {
  const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000
  const DAY_MS = 24 * 60 * 60 * 1000
  const at = Date.now() + RIYADH_OFFSET_MS - daysAgo * DAY_MS
  return new Date(at).toISOString().slice(0, 10)
}

/**
 * #35: the shop's whole ledger in one list, reached by pressing the count of
 * it as it is pressed in the prototype. The figures here are the fixture as it
 * was seeded, so this test sits above the ones that record operations of their
 * own: بقالة الريان has five, أحمد's payment of 200 the newest and سالم's
 * purchase from two months back the oldest.
 */
test('the shop searches its own operations', async ({ page }) => {
  await signIn(page, '0550111222', '+966550111222')

  await page.getByTestId('log-open').click()
  await expect(page).toHaveURL(/\/merchant\/log$/)

  const rows = page.getByTestId('log-row')
  await expect(rows).toHaveCount(5)
  await expect(rows.first()).toContainText('أحمد محمد')
  await expect(rows.first()).toContainText('سداد')
  await expect(rows.first()).toContainText('200')
  await expect(rows.last()).toContainText('سالم العتيبي')

  // By part of a name, and by the mobile as the row above the box writes it.
  await page.getByTestId('log-search').fill('خالد')
  await expect(rows).toHaveCount(2)
  await page.getByTestId('log-search').fill('0550 123 456')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('أحمد محمد')

  // The search is in the URL, so the screen can be handed to somebody else
  // exactly as it was read.
  await expect(page).toHaveURL(/[?&]q=/)

  await page.getByTestId('log-search').fill('')
  await expect(rows).toHaveCount(5)

  // One kind at a time: two payments at this shop, and the same press again
  // puts them all back.
  await page.getByTestId('log-kind-payment').click()
  await expect(rows).toHaveCount(2)
  await page.getByTestId('log-kind-payment').click()
  await expect(rows).toHaveCount(5)

  // A range, in Riyadh's days: only أحمد's payment is inside the fortnight.
  await page.getByTestId('log-from').fill(riyadhDay(14))
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('سداد')

  // Nothing has been recorded tomorrow, and a range with nothing in it is not
  // the same screen as a shop with nothing in it.
  await page.getByTestId('log-from').fill(riyadhDay(-1))
  await expect(page.getByTestId('log-no-results')).toBeVisible()
  await expect(page.getByTestId('log-empty')).toHaveCount(0)
})

test('a shopkeeper is sent back from the customer side, which is not theirs', async ({
  page,
}) => {
  await signIn(page, '0551000001', '+966551000001')
  await expect(page).toHaveURL(/\/merchant$/)

  await go(page, '/customer')

  await expect(page).toHaveURL(/\/merchant$/)
})

test('a customer is sent back from the shop side', async ({ page }) => {
  await signIn(page, '0555987210', '+966555987210')
  await expect(page).toHaveURL(/\/customer$/)

  await go(page, '/merchant')

  await expect(page).toHaveURL(/\/customer$/)
})

/**
 * UC-09: أحمد owes three shops in the fixture, one of them settled. The total
 * is the sum of the two he still owes, so it is a check that the customer's
 * figures come from the same derivation the merchant's do.
 */
/**
 * UC-03: the shop opens one customer's whole account from the dashboard, and
 * only its own. سالم owes 1,250 against a 1,500 limit, so 250 is available.
 */
test('a shopkeeper opens a customer account, and only their own', async ({
  page,
  browser,
}) => {
  // Two sign-ins, each with a code, do not fit in the default budget.
  test.slow()
  await signIn(page, '0550111222', '+966550111222')

  await page
    .getByTestId('connection-row')
    .filter({ hasText: 'سالم العتيبي' })
    .click()

  await expect(page.getByText('سالم العتيبي')).toBeVisible()
  await expect(page.getByText('0533 456 789')).toBeVisible()
  const main = page.locator('main')
  await expect(main).toContainText('1,250')
  await expect(main).toContainText('250')
  await expect(page.getByTestId('transactions')).toContainText('مواد بناء')
  await expect(page.getByTestId('limit-bar')).toBeVisible()

  // The same id, on the phone of the shop next door, is an account that is
  // not there. A second context rather than a second sign-in: two shopkeepers
  // are two phones.
  const salemAtRiyan = new URL(page.url()).pathname
  const { context: nextDoor, page: theirPhone } = await openPhone(browser)
  await signIn(theirPhone, '0551000001', '+966551000001')

  await go(theirPhone, salemAtRiyan)

  await expect(theirPhone.getByRole('heading', { level: 1 })).toHaveText(
    'غير موجود',
  )
  await nextDoor.close()
})

/**
 * UC-04: the shop records what خالد just bought. It waits for him rather than
 * landing on the ledger, which is why his balance does not move.
 */
test('a shopkeeper records an operation, and can call it off', async ({
  page,
}) => {
  await signIn(page, '0550111222', '+966550111222')

  await page.getByTestId('record').click()
  await page.getByLabel('العميل').selectOption({ label: 'خالد علي' })
  await page.getByLabel('المبلغ').fill('250')
  await page.getByLabel('الوصف (اختياري)').fill('مشتريات اليوم')

  // The projection says what the account would read as, before committing.
  await expect(page.getByTestId('projection')).toContainText('250')

  await page.getByRole('button', { name: 'أرسل للعميل' }).click()
  await expect(page.getByTestId('waiting')).toBeVisible()

  // Nothing is owed until he agrees, so the shop's position is unchanged.
  await go(page, '/merchant')
  await expect(page.locator('main')).toContainText('2,050')

  const khalid = page
    .getByTestId('connection-row')
    .filter({ hasText: 'خالد علي' })
  await expect(khalid).toContainText('مسدد')
  await khalid.click()

  const history = page.getByTestId('transactions')
  await expect(history).toContainText('مشتريات اليوم')
  await expect(history).toContainText('بانتظار الموافقة')

  await page.getByTestId('cancel-operation').click()
  await expect(history).toContainText('ملغاة')

  // #35: an operation that is not on the ledger says so in the log as well,
  // rather than reading there as money that moved. The screens are reached by
  // their own links, as the suite reaches them everywhere else.
  await page.getByRole('link', { name: 'رجوع' }).first().click()
  await page.getByTestId('log-open').click()
  await expect(
    page.getByTestId('log-row').filter({ hasText: 'مشتريات اليوم' }),
  ).toContainText('ملغاة')
})

/**
 * UC-11: the invoice behind an operation. The shop attaches it, the customer
 * sees it before agreeing to pay it, and a third phone gets nothing.
 */
test('an operation carries its invoice, and only to the two of them', async ({
  page,
  browser,
}) => {
  test.slow()
  await signIn(page, '0550111222', '+966550111222')
  await page.getByTestId('record').click()
  await page.getByLabel('العميل').selectOption({ label: 'خالد علي' })
  await page.getByLabel('المبلغ').fill('60')
  await page.getByLabel('الوصف (اختياري)').fill('فاتورة اليوم')

  // A one-pixel PNG, which is a real picture and small enough to be one.
  await page.getByTestId('invoice-file').setInputFiles({
    name: 'receipt.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  })
  await expect(page.getByTestId('invoice-picked')).toContainText('receipt.png')

  await page.getByRole('button', { name: 'أرسل للعميل' }).click()
  await expect(page.getByTestId('waiting')).toBeVisible()

  // The customer sees it on the screen where they are asked to agree.
  const { context: his, page: hisPhone } = await openPhone(browser)
  await signIn(hisPhone, '0555987210', '+966555987210')
  await hisPhone.getByTestId('awaiting').first().click()
  await hisPhone.getByTestId('invoice-link').click()
  await expect(hisPhone.getByTestId('invoice-image')).toBeVisible()
  const invoice = new URL(hisPhone.url()).pathname

  // A third phone is given nothing, neither the screen nor the bytes.
  const { context: other, page: otherPhone } = await openPhone(browser)
  await signIn(otherPhone, '0550123456', '+966550123456')
  await go(otherPhone, invoice)
  await expect(otherPhone.getByRole('heading', { level: 1 })).toHaveText(
    'غير موجود',
  )
  const refused = await otherPhone.request.get(
    invoice.replace('/invoice/', '/api/invoices/'),
  )
  expect(refused.status()).toBe(404)

  // Leave the fixture as it was found: the tests share one seeded ledger.
  await page.getByRole('button', { name: 'إلغاء العملية' }).click()
  await his.close()
  await other.close()
})

/**
 * UC-05 and UC-06 at the counter: سالم is past his date and has 250 left of a
 * 1,500 limit. The warning can be gone past; the limit cannot.
 */
test('the limit stops the shop, being late only warns it', async ({ page }) => {
  await signIn(page, '0550111222', '+966550111222')
  await page.getByTestId('record').click()
  await page.getByLabel('العميل').selectOption({ label: 'سالم العتيبي' })

  // Past the limit: refused, with the figures.
  await page.getByLabel('المبلغ').fill('300')
  await page.getByRole('button', { name: 'أرسل للعميل' }).click()
  await expect(page.getByTestId('refusal')).toContainText('يتجاوز الحد')
  await expect(page.getByTestId('refusal')).toContainText('250')
  await expect(page.getByTestId('record-anyway')).toHaveCount(0)

  // Inside the limit but late: warned, and the warning can be passed.
  await page.getByLabel('المبلغ').fill('100')
  await page.getByRole('button', { name: 'أرسل للعميل' }).click()
  await expect(page.getByTestId('refusal')).toContainText('متأخر')
  await page.getByTestId('record-anyway').click()
  await expect(page.getByTestId('waiting')).toBeVisible()

  // Leave the fixture as it was found: the tests share one seeded ledger.
  await page.getByRole('button', { name: 'إلغاء العملية' }).click()
})

/**
 * UC-13 on the fixture: أحمد stands on بقالة الريان's default of 1,000 and
 * سالم has 1,500 of his own. Moving the default has to move the first and
 * leave the second, and the shop has to be put back as it was found.
 *
 * The screens are reached by their own links rather than by `goto`, because
 * each full page load opens another event stream and the browser runs out of
 * connections to the host before the test runs out of steps.
 */
test('the shop’s default moves whoever stands on it, and no one else', async ({
  page,
}) => {
  await signIn(page, '0550111222', '+966550111222')

  const row = (name: string) =>
    page.getByTestId('connection-row').filter({ hasText: name })
  const back = () => page.getByRole('link', { name: 'رجوع' }).first().click()

  await expect(row('سالم العتيبي').getByTestId('overridden')).toBeVisible()
  await expect(row('أحمد محمد').getByTestId('overridden')).toHaveCount(0)

  await openProfile(page)
  await page.getByTestId('settings').click()
  await page.getByLabel('حد الائتمان الافتراضي').fill('2000')
  await page.getByTestId('save-defaults').click()
  await expect(page.getByTestId('defaults-saved')).toContainText('حُفظ')

  // The change is on the record, with who made it and when.
  await expect(page.getByTestId('term-history')).toContainText('1,000')
  await expect(page.getByTestId('term-history')).toContainText('2,000')

  await back()
  await row('أحمد محمد').click()
  await expect(page.getByTestId('balance-hero')).toContainText('2,000')

  await back()
  await row('سالم العتيبي').click()
  await expect(page.getByTestId('balance-hero')).toContainText('1,500')

  // Leave the fixture as it was found: the tests share one seeded ledger.
  await back()
  await openProfile(page)
  await page.getByTestId('settings').click()
  await page.getByLabel('حد الائتمان الافتراضي').fill('1000')
  await page.getByTestId('save-defaults').click()
  await expect(page.getByTestId('defaults-saved')).toBeVisible()
})

/** UC-13: one customer put on their own figure, then back on the shop's. */
test('a customer can be given their own limit and put back', async ({
  page,
}) => {
  await signIn(page, '0550111222', '+966550111222')

  const ahmed = () =>
    page.getByTestId('connection-row').filter({ hasText: 'أحمد محمد' })
  const back = () => page.getByRole('link', { name: 'رجوع' }).first().click()

  await ahmed().click()
  await page.getByTestId('customer-settings').click()

  await page.getByLabel('قيمة خاصة به').first().check()
  await page.getByLabel('حد الائتمان', { exact: true }).fill('400')

  // 400 is under the 800 he already owes: allowed, and said plainly.
  await expect(page.getByTestId('below-balance')).toContainText('800')

  await page.getByTestId('save-terms').click()
  await expect(page.getByTestId('terms-saved')).toBeVisible()

  await back()
  await expect(page.getByTestId('balance-hero')).toContainText('400')

  // And nothing more can be recorded for him until the balance drops.
  await page.getByTestId('record').click()
  await page.getByLabel('المبلغ').fill('50')
  await page.getByRole('button', { name: 'أرسل للعميل' }).click()
  await expect(page.getByTestId('refusal')).toContainText('يتجاوز الحد')

  await back()
  await expect(ahmed().getByTestId('overridden')).toBeVisible()

  // Back on the shop's default, and the fixture as it was found.
  await ahmed().click()
  await page.getByTestId('customer-settings').click()
  await page.getByTestId('reset-terms').click()
  await expect(page.getByTestId('terms-saved')).toBeVisible()
  await expect(page.getByText('من المتجر').first()).toBeVisible()

  await back()
  await back()
  await expect(ahmed().getByTestId('overridden')).toHaveCount(0)
})

/**
 * UC-14: the shopkeeper's figures go behind dots and come back, and the
 * choice is on their row rather than in the tab, so a reload keeps it.
 */
test('one tap hides every amount, and it holds after a reload', async ({
  page,
}) => {
  await signIn(page, '0550111222', '+966550111222')

  const main = page.locator('main')
  const eye = page.getByTestId('amounts-eye')
  await expect(main).toContainText('2,050')
  await expect(eye).toHaveAttribute('aria-pressed', 'false')

  await eye.click()

  await expect(eye).toHaveAttribute('aria-pressed', 'true')
  await expect(main).not.toContainText('2,050')
  await expect(main).toContainText('••••')
  // The pills and the customers' names are not amounts and stay put.
  await expect(main).toContainText('سالم العتيبي')
  await expect(main).toContainText('تجاوز الموعد')

  await page.reload()
  await expect(page.locator('main')).toContainText('••••')

  // #35: the operations log is amounts too, and goes behind the dots with
  // everything else on this side.
  await page.getByTestId('log-open').click()
  await expect(page.getByTestId('log-row').first()).toContainText('••••')
  await expect(page.locator('main')).not.toContainText('1,250')
  await page.getByRole('link', { name: 'رجوع' }).first().click()

  // The account view is covered too, hero and bar and history together.
  await page
    .getByTestId('connection-row')
    .filter({ hasText: 'سالم العتيبي' })
    .click()
  await expect(page.getByTestId('balance-hero')).toContainText('••••')
  await expect(page.getByTestId('balance-hero')).not.toContainText('1,250')
  await expect(page.getByTestId('transactions')).toContainText('••••')

  // Leave the fixture as it was found: the tests share one seeded ledger.
  await page.getByTestId('amounts-eye').click()
  await expect(page.getByTestId('balance-hero')).toContainText('1,250')
})

/**
 * UC-12: the bell. سالم is past his date in the fixture, and nothing happened
 * to make that true — the date came round.
 *
 * #78: so nothing looks for it on the way in any more. The clock that starts
 * with the server has already been round the ledger by the time anybody signs
 * in, which is what this test now proves: the line is waiting, and no screen
 * of this shop's has been opened to write it.
 */
test('the shop is told about a date that came round', async ({ page }) => {
  await signIn(page, '0550111222', '+966550111222')

  await page.getByTestId('bell').click()

  const overdue = page
    .getByTestId('notification')
    .filter({ hasText: 'تجاوز موعده' })
  await expect(overdue.first()).toBeVisible()

  // Opening the list is what clears the count.
  await expect(page.getByTestId('bell-badge')).toHaveCount(0)
})

/**
 * UC-12: a purchase waiting on the customer is answered from the list itself,
 * and once answered it says so rather than offering the buttons again.
 */
test('a customer answers a purchase from the bell', async ({
  page,
  browser,
}) => {
  test.slow()
  const { context: shop, page: shopPhone } = await openPhone(browser)
  await signIn(shopPhone, '0550111222', '+966550111222')
  await shopPhone.getByTestId('record').click()
  await shopPhone.getByLabel('العميل').selectOption({ label: 'خالد علي' })
  await shopPhone.getByLabel('المبلغ').fill('40')
  await shopPhone.getByLabel('الوصف (اختياري)').fill('تمر وقهوة')
  await shopPhone.getByRole('button', { name: 'أرسل للعميل' }).click()
  await expect(shopPhone.getByTestId('waiting')).toBeVisible()

  await signIn(page, '0555987210', '+966555987210')
  await expect(page.getByTestId('bell-badge')).toBeVisible()

  await page.getByTestId('bell').click()
  const waiting = page
    .getByTestId('notification')
    .filter({ hasText: 'بانتظار موافقتك' })
    .first()
  await expect(waiting).toContainText('40')

  await waiting.getByTestId('notification-decline').click()

  await expect(waiting.getByTestId('notification-acted')).toBeVisible()
  await expect(waiting.getByTestId('notification-decline')).toHaveCount(0)

  // The shop's screen moved on by itself: declining travels over the stream.
  await expect(shopPhone.getByTestId('operation-settled')).toBeVisible()
  await shop.close()
})

test('a customer sees every shop they owe, and can open one', async ({
  page,
}) => {
  await signIn(page, '0550123456', '+966550123456')
  await expect(page).toHaveURL(/\/customer$/)

  await expect(page.getByTestId('connection-row')).toHaveCount(3)
  await expect(page.locator('main')).toContainText('1,220')

  await page
    .getByTestId('connection-row')
    .filter({ hasText: 'بقالة الريان' })
    .click()

  await expect(page.getByText('بقالة الريان')).toBeVisible()
  // His history at that shop: a purchase of 1,000 and a payment of 200.
  const history = page.getByTestId('transactions')
  await expect(history).toContainText('1,000')
  await expect(history).toContainText('200')
  await expect(page.getByTestId('pager')).toHaveCount(0)

  // UC-18: 800 of a 1,000 limit is 80% spent, so the bar is on the amber
  // side of the second threshold and says how much of the limit is gone.
  const bar = page.getByTestId('limit-bar')
  await expect(bar).toHaveAttribute('data-percent', '80')
  await expect(bar).toContainText('80%')
})

/**
 * #14: the two phones stay in step over the event stream. أحمد's account page
 * stays open while the shop records something on it, and the row arrives
 * without him touching the screen.
 */
test('an operation recorded on one phone reaches the other', async ({
  page,
  browser,
}) => {
  test.slow()
  await signIn(page, '0550123456', '+966550123456')
  await page
    .getByTestId('connection-row')
    .filter({ hasText: 'بقالة الريان' })
    .click()
  await expect(page.getByTestId('transactions')).toBeVisible()

  const { context: shop, page: shopPhone } = await openPhone(browser)
  await signIn(shopPhone, '0550111222', '+966550111222')
  await shopPhone.getByTestId('record').click()
  await shopPhone.getByLabel('العميل').selectOption({ label: 'أحمد محمد' })
  await shopPhone.getByLabel('المبلغ').fill('75')
  await shopPhone.getByLabel('الوصف (اختياري)').fill('خبز وحليب')
  await shopPhone.getByRole('button', { name: 'أرسل للعميل' }).click()
  await expect(shopPhone.getByTestId('waiting')).toBeVisible()

  // Nobody reloaded this page: the stream brought it.
  await expect(page.getByTestId('transactions')).toContainText('خبز وحليب')
  await expect(page.getByTestId('transactions')).toContainText(
    'بانتظار الموافقة',
  )

  // Leave the fixture as it was found — and calling it off travels the same
  // way, so his screen says so without him touching it either.
  await shopPhone.getByRole('button', { name: 'إلغاء العملية' }).click()
  await expect(page.getByTestId('transactions')).toContainText('ملغاة')

  await shop.close()
})

/**
 * UC-07, end to end across two phones: the shop records, the customer approves
 * and shows the code, the shop applies it, and both screens move on by
 * themselves. The code is read from the screen rather than through the camera,
 * which is the same path a scan takes once the camera has read it.
 */
test('a purchase is agreed on one phone and applied on the other', async ({
  page,
  browser,
}) => {
  test.slow()
  await signIn(page, '0550111222', '+966550111222')
  await page.getByTestId('record').click()
  await page.getByLabel('العميل').selectOption({ label: 'خالد علي' })
  await page.getByLabel('المبلغ').fill('120')
  await page.getByLabel('الوصف (اختياري)').fill('أرز وسكر')
  await page.getByRole('button', { name: 'أرسل للعميل' }).click()
  await expect(page.getByTestId('waiting')).toBeVisible()

  const { context: customer, page: theirPhone } = await openPhone(browser)
  await signIn(theirPhone, '0555987210', '+966555987210')

  await theirPhone.getByTestId('awaiting').click()
  await expect(theirPhone.getByTestId('operation')).toContainText('أرز وسكر')
  await theirPhone.getByRole('button', { name: 'موافقة' }).click()
  await expect(theirPhone.getByTestId('approval-qr')).toBeVisible()
  await expect(theirPhone.getByTestId('countdown')).toContainText('صالح لمدة')
  const code = await theirPhone.getByTestId('approval-text').innerText()

  // The shop's phone: what the camera would have read, applied.
  await page.getByTestId('go-scan').click()
  await page.getByLabel('أو أدخل الرمز').fill(code)
  await page.getByRole('button', { name: 'تسجيل' }).click()
  await expect(page.getByTestId('applied')).toBeVisible()

  // A second scan of the same code applies nothing more.
  await go(page, '/merchant/scan')
  await page.getByLabel('أو أدخل الرمز').fill(code)
  await page.getByRole('button', { name: 'تسجيل' }).click()
  await expect(page.getByTestId('applied')).toBeVisible()

  // Both sides now read the same ledger: خالد owes 120 and nobody refreshed.
  await go(page, '/merchant')
  const khalid = page
    .getByTestId('connection-row')
    .filter({ hasText: 'خالد علي' })
  await expect(khalid).toContainText('120')
  await expect(theirPhone.locator('main')).toContainText('120')

  await customer.close()
})

/**
 * The other half of UC-07: the shop's waiting screen moves on because the
 * ledger changed, not because a timer ran out. Nobody touches this page
 * between the customer declining and it saying so.
 */
test('the shop’s waiting screen moves on when the customer says no', async ({
  page,
  browser,
}) => {
  test.slow()
  await signIn(page, '0550111222', '+966550111222')
  await page.getByTestId('record').click()
  await page.getByLabel('العميل').selectOption({ label: 'سالم العتيبي' })
  await page.getByLabel('المبلغ').fill('60')
  await page.getByRole('button', { name: 'أرسل للعميل' }).click()
  // سالم is past his date, so the shop is warned before it can record.
  await page.getByTestId('record-anyway').click()
  await expect(page.getByTestId('waiting')).toBeVisible()

  const { context: customer, page: theirPhone } = await openPhone(browser)
  await signIn(theirPhone, '0533456789', '+966533456789')
  await theirPhone.getByTestId('awaiting').filter({ hasText: '60' }).click()
  await theirPhone.getByRole('button', { name: 'رفض' }).click()

  await expect(page.getByTestId('operation-settled')).toContainText(
    'رفض العميل',
  )

  await customer.close()
})

/**
 * UC-10: أحمد owes بقالة الريان 800. He settles 300 of it; the ledger moves
 * when the gateway confirms, and the shop's position moves with it.
 */
test('a customer settles part of what they owe', async ({ page, browser }) => {
  test.slow()
  await signIn(page, '0550123456', '+966550123456')
  await page
    .getByTestId('connection-row')
    .filter({ hasText: 'بقالة الريان' })
    .click()
  await page.getByTestId('pay').click()

  await page.getByRole('button', { name: 'مبلغ جزئي' }).click()
  await page.getByLabel('المبلغ').fill('300')
  await page.getByTestId('method-mada').click()
  await page.getByRole('button', { name: /ادفع/ }).click()

  await expect(page.getByTestId('receipt')).toBeVisible()
  await expect(page.getByTestId('receipt')).toContainText('FAKE-')

  // What he owes that shop, and what the shop is owed, both moved.
  await go(page, '/customer')
  await expect(page.locator('main')).toContainText('920')

  const { context: shop, page: shopPhone } = await openPhone(browser)
  await signIn(shopPhone, '0550111222', '+966550111222')
  await expect(
    shopPhone.getByTestId('connection-row').filter({ hasText: 'أحمد محمد' }),
  ).toContainText('500')
  await shop.close()
})

test('a customer cannot open another customer’s account', async ({ page }) => {
  await signIn(page, '0533456789', '+966533456789')
  await expect(page).toHaveURL(/\/customer$/)

  const mine = page.getByTestId('connection-row').first()
  const href = await mine.getAttribute('href')
  const stranger = `${href?.replace(/[^/]+$/, '')}not-my-connection`

  await go(page, stranger)

  await expect(page.getByTestId('transactions')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('غير موجود')
})

/**
 * UC-08: a person no shop keeps becomes a customer by being scanned, and only
 * once they have agreed. Nothing of theirs is in the shop's list before that.
 */
test('a shop asks for a customer by scanning their card', async ({
  page,
  browser,
}) => {
  test.slow()
  await signIn(page, '0500000002', '+966500000002')
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByTestId('my-card-link').click()
  const card = await page.getByTestId('approval-text').innerText()

  const { context: shop, page: shopPhone } = await openPhone(browser)
  await signIn(shopPhone, '0550111222', '+966550111222')
  await expect(shopPhone.getByTestId('connection-row')).toHaveCount(3)

  await go(shopPhone, '/merchant/scan')
  await shopPhone.getByLabel('أو أدخل الرمز').fill(card)
  await shopPhone.getByRole('button', { name: 'تسجيل' }).click()
  await expect(shopPhone.getByTestId('connect-outcome')).toContainText(
    'أُرسل الطلب',
  )

  // Still three customers: asking is not adding.
  await go(shopPhone, '/merchant')
  await expect(shopPhone.getByTestId('connection-row')).toHaveCount(3)

  // The request reached the other phone without it being touched.
  await expect(page.getByTestId('connection-request')).toContainText(
    'بقالة الريان',
  )

  // #81: and the code the shop just scanned is still the code on the screen.
  // The request arriving is what reloads this route, and the code is not the
  // route's to mint — otherwise the QR would change under the camera.
  await expect(page.getByTestId('approval-text')).toHaveText(card)
  await page.getByRole('button', { name: 'موافقة' }).click()
  await expect(page).toHaveURL(/\/customer$/)

  await go(shopPhone, '/merchant')
  await expect(shopPhone.getByTestId('connection-row')).toHaveCount(4)
  await expect(
    shopPhone.getByTestId('connection-row').filter({ hasText: 'عبدالله' }),
  ).toBeVisible()

  await shop.close()
})

/**
 * UC-16: the code on بقالة الريان's counter. فاطمة is on neither side of the
 * ledger, so her scan has to walk the whole way: sign in, land back on the
 * shop she was going to, join it, and arrive at her account with it.
 *
 * After the scanning test above, so the counts it makes still hold.
 */
test('a customer joins a shop by the code on its counter', async ({
  page,
  browser,
}) => {
  test.slow()
  const { context: shop, page: shopPhone } = await openPhone(browser)
  await signIn(shopPhone, '0550111222', '+966550111222')

  // The shop's own code, small on the dashboard and big one press away.
  await expect(shopPhone.getByTestId('shop-qr')).toBeVisible()
  await shopPhone.getByTestId('shop-qr-open').click()
  await expect(shopPhone.getByTestId('shop-qr-full')).toBeVisible()

  // What her camera would have read, opened while she is signed out.
  const printed = await shopPhone.locator('main span[dir="ltr"]').innerText()
  const shopPath = new URL(printed).pathname

  await go(page, shopPath)
  await expect(page).toHaveURL(/\/sign-in/)

  await signInHere(page, '0500000003', '+966500000003')

  // Back where she was going, with the shop's terms in front of her.
  await expect(page).toHaveURL(new RegExp(`${shopPath}$`))
  await expect(page.getByTestId('join-shop')).toContainText('1,000')

  await page.getByTestId('join').click()

  // Her account with that shop, and the shop has her.
  await expect(page.getByTestId('balance-hero')).toContainText('بقالة الريان')
  await go(shopPhone, '/merchant')
  await expect(
    shopPhone.getByTestId('connection-row').filter({ hasText: 'فاطمة' }),
  ).toBeVisible()

  await shop.close()
})

test('signing out ends the session and the ledger is closed again', async ({
  page,
}) => {
  await signIn(page, '0533456789', '+966533456789')
  await expect(page).toHaveURL(/\/customer$/)

  await openProfile(page)
  await page.getByTestId('sign-out').click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await go(page, '/customer')
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('there is no switch for someone who is only on one side', async ({
  page,
}) => {
  await signIn(page, '0550123456', '+966550123456')

  await expect(page).toHaveURL(/\/customer$/)
  await openProfile(page)
  await expect(page.getByTestId('side-switch')).toHaveCount(0)
})

/**
 * نورة is on neither side of the ledger, which is what the welcome screen is
 * for, and opening a shop is the way off it.
 *
 * Serial, and in this order: both tests sign in as the same person, and a new
 * code replaces the last one for a number, so running them at once would have
 * them race. The second one turns her into a shopkeeper, which is why it goes
 * last.
 */
test.describe.configure({ mode: 'serial' })

test.describe('a person on neither side', () => {
  test('cannot open a shop without a name', async ({ page }) => {
    await signIn(page, '0500000001', '+966500000001')
    await go(page, '/merchant/new')

    await page.getByRole('button', { name: 'افتح المتجر' }).click()

    await expect(page.getByRole('alert')).toContainText('المتجر يحتاج اسمًا')
    await expect(page).toHaveURL(/\/merchant\/new$/)
  })

  test('is told so, and can open a shop', async ({ page }) => {
    await signIn(page, '0500000001', '+966500000001')

    await expect(page).toHaveURL(/\/welcome$/)
    await page.getByRole('link', { name: 'لديّ متجر' }).click()

    await page.getByLabel('اسم المتجر').fill('بقالة نورة')
    await page.getByRole('button', { name: 'افتح المتجر' }).click()

    await expect(page).toHaveURL(/\/merchant$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'بقالة نورة',
    )
    await expect(page.getByText('لا عملاء بعد')).toBeVisible()
  })
})
