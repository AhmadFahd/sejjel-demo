import { halalasToRiyals } from '#/lib/money'
import type { Locale } from './locales'

/**
 * Arabic month names and Latin digits, as the prototype has them: `27 أغسطس
 * 2026`, `1,250 ر.س`. Without the calendar override, `ar-SA` would answer in
 * Hijri, which is not what a shop's due date means here.
 */
const INTL_TAG: Record<Locale, string> = {
  ar: 'ar-SA-u-ca-gregory-nu-latn',
  en: 'en-GB',
}

/** The day boundary is Riyadh's, whatever the device believes. */
export const TIME_ZONE = 'Asia/Riyadh'

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(INTL_TAG[locale]).format(value)
}

/**
 * Whole riyals unless there are halalas, which is how every amount in the
 * prototype reads. The currency word comes from the catalogue, so it is ر.س
 * beside Arabic and SAR beside English.
 */
export function formatMoney(
  halalas: number,
  locale: Locale,
  currency: string,
): string {
  const riyals = halalasToRiyals(halalas)
  const fractionDigits = Number.isInteger(riyals) ? 0 : 2
  const amount = new Intl.NumberFormat(INTL_TAG[locale], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(riyals)

  return locale === 'ar' ? `${amount} ${currency}` : `${currency} ${amount}`
}

/** Names in a sentence: أ و ب in Arabic, A and B in English. */
export function formatList(values: Array<string>, locale: Locale) {
  return new Intl.ListFormat(INTL_TAG[locale], {
    style: 'long',
    type: 'conjunction',
  }).format(values)
}

export function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_TAG[locale], {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_TAG[locale], {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
