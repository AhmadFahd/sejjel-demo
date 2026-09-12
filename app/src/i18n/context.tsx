import { createContext, useContext, useMemo } from 'react'
import {
  formatDate,
  formatList,
  formatMoney,
  formatNumber,
  formatTime,
  maskedAmount,
} from './format'
import { createTranslate } from './translate'
import { halalasToRiyals } from '#/lib/money'
import { directionOf } from './locales'
import type { ReactNode } from 'react'
import type { Locale } from './locales'
import type { Translate } from './translate'

export type I18n = {
  locale: Locale
  dir: 'rtl' | 'ltr'
  t: Translate
  money: (halalas: number) => string
  /** An amount with no currency beside it, for a card that carries its own. */
  amount: (halalas: number) => string
  /** UC-14: whether the figures are behind dots on this person's screen. */
  amountsHidden: boolean
  number: (value: number) => string
  date: (value: Date) => string
  time: (value: Date) => string
  list: (values: Array<string>) => string
}

const I18nContext = createContext<I18n | null>(null)

/**
 * UC-14: hiding the amounts is a display concern and nothing more, so it is
 * done here, where every screen already comes for its formatting. Nothing
 * about what the server sends changes, and no screen has to remember.
 */
export function createI18n(locale: Locale, amountsHidden = false): I18n {
  const t = createTranslate(locale)
  const dots = t('money.hidden')

  return {
    locale,
    dir: directionOf(locale),
    t,
    amountsHidden,
    money: (halalas) =>
      amountsHidden
        ? maskedAmount(dots, locale, t('money.currency'))
        : formatMoney(halalas, locale, t('money.currency')),
    amount: (halalas) =>
      amountsHidden ? dots : formatNumber(halalasToRiyals(halalas), locale),
    number: (value) => formatNumber(value, locale),
    date: (value) => formatDate(value, locale),
    time: (value) => formatTime(value, locale),
    list: (values) => formatList(values, locale),
  }
}

export function I18nProvider({
  locale,
  amountsHidden = false,
  children,
}: {
  locale: Locale
  amountsHidden?: boolean
  children: ReactNode
}) {
  const value = useMemo(
    () => createI18n(locale, amountsHidden),
    [locale, amountsHidden],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n needs an I18nProvider above it')
  return value
}
