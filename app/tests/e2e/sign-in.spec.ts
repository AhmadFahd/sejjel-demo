import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { OTP_LOG } from '../../playwright.config'

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

test('a seeded customer signs in with a code, and stays signed in', async ({
  page,
}) => {
  await page.goto('/sign-in')

  await page.getByLabel('رقم الجوال').fill('0550123456')
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()

  await expect(page.getByLabel('رمز التحقق')).toBeVisible()
  await page.getByLabel('رمز التحقق').fill(codeSentTo('+966550123456'))
  await page.getByRole('button', { name: 'دخول' }).click()

  await expect(page.getByTestId('session')).toContainText('أحمد محمد')

  // A session is a row, not a page's memory.
  await page.reload()
  await expect(page.getByTestId('session')).toContainText('أحمد محمد')
})

test('a wrong code is refused', async ({ page }) => {
  await page.goto('/sign-in')

  await page.getByLabel('رقم الجوال').fill('0550123456')
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()
  await page.getByLabel('رمز التحقق').fill('000000')
  await page.getByRole('button', { name: 'دخول' }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByTestId('session')).toHaveCount(0)
})

test('a number nobody has connected gets no account', async ({ page }) => {
  await page.goto('/sign-in')

  await page.getByLabel('رقم الجوال').fill('0500000000')
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()

  // Even if a code goes out, verifying it must not create a person.
  await expect(page.getByLabel('رمز التحقق')).toBeVisible()
  await page.getByLabel('رمز التحقق').fill(codeSentTo('+966500000000'))
  await page.getByRole('button', { name: 'دخول' }).click()

  await expect(page.getByRole('alert')).toBeVisible()
})

test('the language a signed-in person picks follows their account', async ({
  page,
  context,
}) => {
  await page.goto('/sign-in')
  await page.getByLabel('رقم الجوال').fill('0555987210')
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()
  await expect(page.getByLabel('رمز التحقق')).toBeVisible()
  await page.getByLabel('رمز التحقق').fill(codeSentTo('+966555987210'))
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page.getByTestId('session')).toContainText('خالد علي')

  await page.getByTestId('locale-switch').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // Throw the cookie away: the choice has to come back from the row.
  await context.clearCookies({ name: 'sejjel_locale' })
  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})
