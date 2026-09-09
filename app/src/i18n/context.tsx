import { createContext, useContext, useMemo } from 'react'
import { formatDate, formatMoney, formatNumber, formatTime } from './format'
import { createTranslate } from './translate'
import { directionOf } from './locales'
import type { ReactNode } from 'react'
import type { Locale } from './locales'
import type { Translate } from './translate'

export type I18n = {
  locale: Locale
  dir: 'rtl' | 'ltr'
  t: Translate
  money: (halalas: number) => string
  number: (value: number) => string
  date: (value: Date) => string
  time: (value: Date) => string
}

const I18nContext = createContext<I18n | null>(null)

export function createI18n(locale: Locale): I18n {
  const t = createTranslate(locale)
  return {
    locale,
    dir: directionOf(locale),
    t,
    money: (halalas) => formatMoney(halalas, locale, t('money.currency')),
    number: (value) => formatNumber(value, locale),
    date: (value) => formatDate(value, locale),
    time: (value) => formatTime(value, locale),
  }
}

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale
  children: ReactNode
}) {
  const value = useMemo(() => createI18n(locale), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n needs an I18nProvider above it')
  return value
}
