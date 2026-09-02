import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, directionOf, resolveLocale } from '#/i18n/locales'
import { formatDate, formatMoney, formatTime } from '#/i18n/format'
import { CATALOGUES, createTranslate } from '#/i18n/translate'
import { riyalsToHalalas } from '#/lib/money'

describe('locales', () => {
  it('gives Arabic a right-to-left document and English a left-to-right one', () => {
    expect(directionOf('ar')).toBe('rtl')
    expect(directionOf('en')).toBe('ltr')
  })

  it('honours a choice already made', () => {
    expect(resolveLocale('en')).toBe('en')
  })

  it('gives a first-time visitor Arabic', () => {
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE)
    expect(resolveLocale(undefined, '')).toBe(DEFAULT_LOCALE)
  })

  it('ignores a stored value that means nothing', () => {
    expect(resolveLocale('fr')).toBe(DEFAULT_LOCALE)
  })
})

describe('catalogues', () => {
  it('carry exactly the same keys', () => {
    expect(Object.keys(CATALOGUES.ar).sort()).toEqual(
      Object.keys(CATALOGUES.en).sort(),
    )
  })

  it('leave no message empty', () => {
    for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
      for (const [key, message] of Object.entries(catalogue)) {
        expect(message, `${locale}.${key}`).not.toBe('')
      }
    }
  })

  it('fills placeholders, and leaves an unknown one alone', () => {
    const t = createTranslate('en')
    expect(t('limit.used', { percent: 60 })).toBe('60% of the limit used')
    expect(t('limit.used', {})).toBe('{percent}% of the limit used')
  })
})

describe('formatting', () => {
  const due = new Date('2026-08-27T06:00:00Z')

  it('writes money the way the prototype does, in each language', () => {
    expect(formatMoney(riyalsToHalalas(1250), 'ar', 'ر.س')).toBe('1,250 ر.س')
    expect(formatMoney(riyalsToHalalas(1250), 'en', 'SAR')).toBe('SAR 1,250')
  })

  it('shows halalas only when there are any', () => {
    expect(formatMoney(125050, 'ar', 'ر.س')).toBe('1,250.50 ر.س')
  })

  it('keeps the Gregorian calendar and Latin digits in Arabic', () => {
    expect(formatDate(due, 'ar')).toBe('27 أغسطس 2026')
    expect(formatDate(due, 'en')).toBe('27 August 2026')
  })

  it('tells the time in Riyadh, wherever the machine is', () => {
    expect(formatTime(due, 'en')).toBe('9:00')
    expect(formatTime(due, 'ar')).toBe('9:00 ص')
  })
})

/**
 * The catalogue is only the source of truth if nothing bypasses it. Arabic in a
 * component means a string that was never translated.
 */
describe('no untranslated copy', () => {
  const uiDirectories = ['src/routes', 'src/components']
  const arabic = /[؀-ۿ]/

  const walk = (dir: string): Array<string> => {
    let files: Array<string> = []
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) files = files.concat(walk(path))
      else if (/\.tsx?$/.test(path)) files.push(path)
    }
    return files
  }

  it('keeps Arabic out of the components', () => {
    const offenders = uiDirectories
      .filter((dir) => {
        try {
          return statSync(dir).isDirectory()
        } catch {
          return false
        }
      })
      .flatMap(walk)
      .filter((file) => arabic.test(readFileSync(file, 'utf8')))

    expect(offenders).toEqual([])
  })
})
