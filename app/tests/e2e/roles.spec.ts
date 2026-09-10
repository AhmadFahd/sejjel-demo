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
