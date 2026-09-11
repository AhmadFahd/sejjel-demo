import type { Locale } from '#/i18n/locales'

/**
 * Copy the variants need and the catalogues do not have. It lives here rather
 * than in `src/i18n/messages` so that throwing the losing variants away does
 * not leave orphaned keys behind in the real app.
 *
 * Arabic is the source, as it is in the catalogues: this is a Saudi shop's
 * ledger, and the screen has to be judged in the language it will be read in.
 */
const ar = {
  hero: 'دفترك مع المحل، في جوالك',
  trust: 'بدون كلمة سر. رمز واحد يصل جوالك.',
  keypadHint: 'اكتب رقمك بالأرقام',
  codeHint: 'اكتب الرمز الذي وصلك',
  sentTo: 'أُرسل الرمز إلى',
  resendIn: 'رمز جديد بعد {seconds} ثانية',
  changeNumber: 'تغيير الرقم',
  autoSubmit: 'يُقبل الرمز تلقائيًا عند اكتماله',
  stepOf: 'خطوة {current} من {total}',
  stepPhone: 'رقمك',
  stepCode: 'الرمز',
  backspace: 'حذف رقم',
  clear: 'مسح',
  digit: 'الرقم {position}',
  reasonBalance: 'تعرف كم لك وكم عليك',
  reasonPay: 'تسدّد من جوالك',
  reasonRecord: 'كل عملية موثّقة للطرفين',
  sheetTitle: 'ادخل إلى دفترك',
}

type Copy = typeof ar

const en: Copy = {
  hero: 'Your ledger with the shop, on your phone',
  trust: 'No password. One code, sent to your phone.',
  keypadHint: 'Tap your number in',
  codeHint: 'Tap in the code you were sent',
  sentTo: 'The code went to',
  resendIn: 'Another code in {seconds}s',
  changeNumber: 'Change the number',
  autoSubmit: 'The code is accepted as soon as it is complete',
  stepOf: 'Step {current} of {total}',
  stepPhone: 'Your number',
  stepCode: 'The code',
  backspace: 'Delete a digit',
  clear: 'Clear',
  digit: 'Digit {position}',
  reasonBalance: 'See what you owe and what is owed to you',
  reasonPay: 'Pay from your phone',
  reasonRecord: 'Every purchase recorded for both sides',
  sheetTitle: 'Get into your ledger',
}

const COPY: Record<Locale, Copy> = { ar, en }

export type PrototypeCopy = (
  key: keyof Copy,
  params?: Record<string, string | number>,
) => string

/** The same `{name}` substitution the catalogues use, over the copy above. */
export function prototypeCopy(locale: Locale): PrototypeCopy {
  const catalogue = COPY[locale]

  return (key, params) => {
    const message = catalogue[key]
    if (!params) return message
    return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in params ? String(params[name]) : whole,
    )
  }
}
