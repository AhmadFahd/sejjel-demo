import { useRouter } from '@tanstack/react-router'
import { cx } from './primitives'
import { useI18n } from '#/i18n/context'
import { changeLocale } from '#/i18n/server'

/**
 * The language switch, as a control a navigation bar can hold. The document's
 * direction changes with it, so it reloads the route rather than swapping
 * strings underneath a layout that was laid out the other way round.
 */
export function LocaleToggle({ className }: { className?: string }) {
  const { locale, t } = useI18n()
  const router = useRouter()

  return (
    <button
      type="button"
      aria-label={t('locale.label')}
      data-testid="locale-switch"
      className={cx(
        'rounded-full px-3 py-1.5 text-[12.5px] font-black transition',
        className,
      )}
      onClick={async () => {
        await changeLocale({ data: locale === 'ar' ? 'en' : 'ar' })
        await router.invalidate()
      }}
    >
      {t('locale.switch')}
    </button>
  )
}
