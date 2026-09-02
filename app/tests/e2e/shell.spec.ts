import { expect, test } from '@playwright/test'

test('the shell renders right to left and reports its environment', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page).toHaveTitle('سجّل')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('سجّل')
  await expect(page.getByTestId('environment')).toContainText('production')
})

test('switching language turns the document around, and it stays turned', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByTestId('locale-switch').click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sejjel')

  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('Sejjel')
})
