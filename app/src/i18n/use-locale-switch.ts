import { useRouter } from '@tanstack/react-router'
import { useI18n } from './context'
import { changeLocale } from './server'

/**
 * The act of switching language, wherever a screen puts the control for it.
 * The document turns around with the language, so the route is reloaded rather
 * than having its strings swapped underneath a layout that was laid out the
 * other way round.
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
    ariaLabel: t('locale.label'),
    switchNow: async () => {
      await changeLocale({ data: other })
      await router.invalidate()
    },
  }
}
