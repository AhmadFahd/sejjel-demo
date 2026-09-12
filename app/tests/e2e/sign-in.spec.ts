import { readFileSync } from 'node:fs'
import { expect, go, hydrated, reload, test } from './fixtures'
import { OTP_LOG } from '../../playwright.config'
import type { Page } from '@playwright/test'

/**
 * The fake OTP sender writes every code it "sends" to a file. Reading it here
 * is the test standing in for a phone.
 */
function codeSentTo(phoneNumber: string): string {
  const lines = readFileSync(OTP_LOG, 'utf8').trim().split('\n')
  const line = lines.reverse().find((entry) => entry.startsWith(phoneNumber))
  if (!line) throw new Error(`No code was sent to ${phoneNumber}`)
  return line.split(' ')[1]
}

/**
 * The code goes in one box at a time, the way a person types it, and the last
 * digit signs them in without anything else being pressed.
 */
async function typeCode(page: Page, code: string) {
  await page.getByLabel('الرقم 1').click()
  await page.keyboard.type(code)
}

test('a seeded customer signs in with a code, and stays signed in', async ({
  page,
}) => {
  await go(page, '/sign-in')

  await page.getByLabel('رقم الجوال').fill('0550123456')
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()

  await expect(page.getByTestId('code-boxes')).toBeVisible()
  await typeCode(page, codeSentTo('+966550123456'))

  // أحمد owes three shops and keeps none, so he lands on the customer side.
  await expect(page).toHaveURL(/\/customer$/)
  // Signing in lands on a document of its own, with a window of its own.
  await hydrated(page)
  await expect(page.getByText('بقالة الريان')).toBeVisible()

  // A session is a row, not a page's memory.
  await reload(page)
  await expect(page.getByText('بقالة الريان')).toBeVisible()
})

// Each test signs in as a different seeded person: a new code replaces the
// last one for that number, so two tests sharing a number race each other.
test('a wrong code is refused', async ({ page }) => {
  await go(page, '/sign-in')

  await page.getByLabel('رقم الجوال').fill('0533456789')
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()
  await expect(page.getByTestId('code-boxes')).toBeVisible()
  await typeCode(page, '000000')

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('a number nobody has connected gets no account', async ({ page }) => {
  await go(page, '/sign-in')

  await page.getByLabel('رقم الجوال').fill('0500000000')
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()

  // Even if a code goes out, verifying it must not create a person.
  await expect(page.getByTestId('code-boxes')).toBeVisible()
  await typeCode(page, codeSentTo('+966500000000'))

  await expect(page.getByRole('alert')).toBeVisible()
})

test('the language a signed-in person picks follows their account', async ({
  page,
  context,
}) => {
  await go(page, '/sign-in')
  await page.getByLabel('رقم الجوال').fill('0555987210')
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()
  await expect(page.getByTestId('code-boxes')).toBeVisible()
  await typeCode(page, codeSentTo('+966555987210'))
  await expect(page).toHaveURL(/\/customer$/)
  // Signing in lands on a document of its own, with a window of its own.
  await hydrated(page)

  // PROTOTYPE (no-app-bar): the language lives in the profile now.
  await page.getByTestId('profile').click()
  await page.getByTestId('locale-switch').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // Throw the cookie away: the choice has to come back from the row.
  await context.clearCookies({ name: 'sejjel_locale' })
  await reload(page)

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // Leave the fixture as it was found. His language is on his row now, and
  // the rest of the suite reads his screens in Arabic.
  await page.getByTestId('profile').click()
  await page.getByTestId('locale-switch').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
})
