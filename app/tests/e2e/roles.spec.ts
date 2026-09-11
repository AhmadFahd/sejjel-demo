import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { OTP_LOG } from '../../playwright.config'

function codeSentTo(phoneNumber: string): string {
  const lines = readFileSync(OTP_LOG, 'utf8').trim().split('\n')
  const line = lines.reverse().find((entry) => entry.startsWith(phoneNumber))
  if (!line) throw new Error(`No code was sent to ${phoneNumber}`)
  return line.split(' ')[1]
}

async function signIn(page: Page, typed: string, e164: string) {
  await page.goto('/sign-in')
  await page.getByLabel('رقم الجوال').fill(typed)
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()
  await expect(page.getByLabel('رمز التحقق')).toBeVisible()
  await page.getByLabel('رمز التحقق').fill(codeSentTo(e164))
  await page.getByRole('button', { name: 'دخول' }).click()

  // The session lands with the navigation, so a goto before this races it.
  await expect(page).not.toHaveURL(/\/sign-in$/)
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

test('a shopkeeper is sent back from the customer side, which is not theirs', async ({
  page,
}) => {
  await signIn(page, '0551000001', '+966551000001')
  await expect(page).toHaveURL(/\/merchant$/)

  await page.goto('/customer')

  await expect(page).toHaveURL(/\/merchant$/)
})

test('a customer is sent back from the shop side', async ({ page }) => {
  await signIn(page, '0555987210', '+966555987210')
  await expect(page).toHaveURL(/\/customer$/)

  await page.goto('/merchant')

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
  const nextDoor = await browser.newContext()
  const theirPhone = await nextDoor.newPage()
  await signIn(theirPhone, '0551000001', '+966551000001')

  await theirPhone.goto(salemAtRiyan)

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
  await page.goto('/merchant')
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

  const shop = await browser.newContext()
  const shopPhone = await shop.newPage()
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

  const customer = await browser.newContext()
  const theirPhone = await customer.newPage()
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
  await page.goto('/merchant/scan')
  await page.getByLabel('أو أدخل الرمز').fill(code)
  await page.getByRole('button', { name: 'تسجيل' }).click()
  await expect(page.getByTestId('applied')).toBeVisible()

  // Both sides now read the same ledger: خالد owes 120 and nobody refreshed.
  await page.goto('/merchant')
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
  await expect(page.getByTestId('waiting')).toBeVisible()

  const customer = await browser.newContext()
  const theirPhone = await customer.newPage()
  await signIn(theirPhone, '0533456789', '+966533456789')
  await theirPhone.getByTestId('awaiting').click()
  await theirPhone.getByRole('button', { name: 'رفض' }).click()

  await expect(page.getByTestId('operation-settled')).toContainText(
    'رفض العميل',
  )

  await customer.close()
})

test('a customer cannot open another customer’s account', async ({ page }) => {
  await signIn(page, '0533456789', '+966533456789')
  await expect(page).toHaveURL(/\/customer$/)

  const mine = page.getByTestId('connection-row').first()
  const href = await mine.getAttribute('href')
  const stranger = `${href?.replace(/[^/]+$/, '')}not-my-connection`

  await page.goto(stranger)

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

  const shop = await browser.newContext()
  const shopPhone = await shop.newPage()
  await signIn(shopPhone, '0550111222', '+966550111222')
  await expect(shopPhone.getByTestId('connection-row')).toHaveCount(3)

  await shopPhone.goto('/merchant/scan')
  await shopPhone.getByLabel('أو أدخل الرمز').fill(card)
  await shopPhone.getByRole('button', { name: 'تسجيل' }).click()
  await expect(shopPhone.getByTestId('connect-outcome')).toContainText(
    'أُرسل الطلب',
  )

  // Still three customers: asking is not adding.
  await shopPhone.goto('/merchant')
  await expect(shopPhone.getByTestId('connection-row')).toHaveCount(3)

  // The request reached the other phone without it being touched.
  await expect(page.getByTestId('connection-request')).toContainText(
    'بقالة الريان',
  )
  await page.getByRole('button', { name: 'موافقة' }).click()
  await expect(page).toHaveURL(/\/customer$/)

  await shopPhone.goto('/merchant')
  await expect(shopPhone.getByTestId('connection-row')).toHaveCount(4)
  await expect(
    shopPhone.getByTestId('connection-row').filter({ hasText: 'عبدالله' }),
  ).toBeVisible()

  await shop.close()
})

test('signing out ends the session and the ledger is closed again', async ({
  page,
}) => {
  await signIn(page, '0533456789', '+966533456789')
  await expect(page).toHaveURL(/\/customer$/)

  await page.getByTestId('sign-out').click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto('/customer')
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('there is no switch for someone who is only on one side', async ({
  page,
}) => {
  await signIn(page, '0550123456', '+966550123456')

  await expect(page).toHaveURL(/\/customer$/)
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
    await page.goto('/merchant/new')

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
