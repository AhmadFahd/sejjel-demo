import { expect, go, test } from './fixtures'

test('the shell renders right to left and reports its environment', async ({
  page,
}) => {
  await go(page, '/status')

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page).toHaveTitle('سجّل')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('سجّل')
  await expect(page.getByTestId('environment')).toContainText('production')
})

test('switching language turns the document around, and it stays turned', async ({
  page,
}) => {
  // Asked on the front door rather than on /status: a diagnostic page has no
  // chrome, and the language control now lives in the chrome of the screens
  // people actually arrive on.
  await go(page, '/sign-in')
  await page.getByTestId('locale-switch').click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Your ledger with the shop, on your phone',
  )

  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('Sejjel')
})

test('the gallery shows every component in both directions', async ({
  page,
}) => {
  await go(page, '/design')

  const arabic = page.getByTestId('gallery-ar')
  const english = page.getByTestId('gallery-en')

  await expect(arabic).toHaveAttribute('data-dir', 'rtl')
  await expect(english).toHaveAttribute('data-dir', 'ltr')

  // The same amount, written the way each language writes it.
  await expect(arabic).toContainText('800 ر.س')
  await expect(english).toContainText('SAR 800')

  // The status pills, from real ledger states rather than hard-coded strings.
  await expect(arabic.locator('[data-status="overdue"]').first()).toHaveText(
    /تجاوز الموعد/,
  )
  await expect(english.locator('[data-status="settled"]').first()).toHaveText(
    /Settled/,
  )

  // The limit bar colours up with what is used: 800 of 1,000 is 80%.
  await expect(arabic.getByTestId('limit-bar').first()).toHaveAttribute(
    'data-percent',
    '80',
  )
})
