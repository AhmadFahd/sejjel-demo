import { cx } from './primitives'
import { useLocaleSwitch } from '#/i18n/use-locale-switch'

/**
 * The language switch as a control a header or a sheet can hold. The screens
 * behind sign-in keep theirs in the profile instead; this is for the two
 * screens a person meets before there is one.
 */
export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocaleSwitch()

  return (
    <button
      type="button"
      aria-label={locale.ariaLabel}
      data-testid="locale-switch"
      className={cx(
        'rounded-full px-3 py-1.5 text-[12.5px] font-black transition',
        className,
      )}
      onClick={() => void locale.switchNow()}
    >
      {locale.label}
    </button>
  )
}
