import { useRouter } from '@tanstack/react-router'
import { useI18n } from '#/i18n/context'
import { changeLocale } from '#/i18n/server'

/**
 * PROTOTYPE. The act of switching, which every variant does the same way: the
 * document turns around with the language, so the route is reloaded rather
 * than having its strings swapped underneath a layout laid out the other way.
 * Only the placement is under question, so only the placement differs.
 */
export function useLocaleSwitch() {
  const { locale, t } = useI18n()
  const router = useRouter()
  const other = locale === 'ar' ? 'en' : 'ar'

  return {
    locale,
    other,
    /** Always the other language, written in itself: "English" / "العربية". */
    label: t('locale.switch'),
    /** The same thing in two letters, for where a word will not fit. */
    short: other === 'en' ? 'EN' : 'ع',
    ariaLabel: t('locale.label'),
    switchNow: async () => {
      await changeLocale({ data: other })
      await router.invalidate()
    },
  }
}
