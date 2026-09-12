import { describe, expect, it } from 'vitest'
import { createI18n } from '#/i18n/context'
import { riyalsToHalalas } from '#/lib/money'

const shown = (locale: 'ar' | 'en') => createI18n(locale)
const hidden = (locale: 'ar' | 'en') => createI18n(locale, true)

describe('UC-14: hiding the amounts', () => {
  it('is off unless it is asked for', () => {
    expect(shown('ar').amountsHidden).toBe(false)
    expect(shown('ar').money(riyalsToHalalas(1250))).toBe('1,250 ر.س')
  })

  it('puts the figure behind dots and keeps the currency beside it', () => {
    expect(hidden('ar').money(riyalsToHalalas(1250))).toBe('•••• ر.س')
    expect(hidden('en').money(riyalsToHalalas(1250))).toBe('SAR ••••')
  })

  /** The hero carries its own currency, so the amount inside it has none. */
  it('hides a bare amount without a currency of its own', () => {
    expect(shown('ar').amount(riyalsToHalalas(800))).toBe('800')
    expect(hidden('ar').amount(riyalsToHalalas(800))).toBe('••••')
  })

  it('hides every amount, whatever its size', () => {
    for (const riyals of [0, 1, 999_999]) {
      expect(hidden('ar').money(riyalsToHalalas(riyals))).toBe('•••• ر.س')
    }
  })

  /**
   * Counts and dates are not amounts: a hidden ledger that also hid how many
   * operations there were, or when they fall due, would be unreadable.
   */
  it('leaves counts and dates alone', () => {
    const masked = hidden('ar')
    expect(masked.number(12)).toBe('12')
    expect(masked.date(new Date('2026-09-01T09:00:00Z'))).toContain('2026')
  })
})
