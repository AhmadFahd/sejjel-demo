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
