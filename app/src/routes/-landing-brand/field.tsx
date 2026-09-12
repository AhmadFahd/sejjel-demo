import { Link } from '@tanstack/react-router'
import { Mark, MarkTexture, Wordmark } from '#/components/brand'
import { LocaleToggle } from '#/components/locale-toggle'
import { useI18n } from '#/i18n/context'

/**
 * PROTOTYPE VARIANT B — «الحقل» / Field. Throwaway.
 *
 * The green ground taken at full strength: the icon, at poster size, is the
 * page, and the words are a bone panel laid against it. Two rules of the guide
 * shape the split. The full logo is never laid over the texture, so it sits on
 * the bone side where it also gets its two colours; the green side carries the
 * icon alone, on plain ground, because a mark over a field of the same mark is
 * a fight nobody wins.
 *
 * What it argues: the icon is strong enough to carry the page on its own, and
 * a brand that owns one colour should spend it.
 */
export function LandingField() {
  const { t } = useI18n()

  return (
    <div className="min-h-dvh bg-brand lg:grid lg:grid-cols-[0.85fr_1.15fr]">
      {/* The icon's half. On a phone it is the top of the page; on a desktop it
          stays put while the words scroll past it. */}
      <div className="relative flex flex-col justify-between px-6 pt-5 pb-16 sm:px-10 lg:sticky lg:top-0 lg:h-dvh lg:pb-10">
        <div className="flex justify-end">
          <LocaleToggle className="text-bone/70 hover:bg-bone/10 hover:text-bone" />
        </div>

        <div className="flex flex-1 items-center justify-center py-12 lg:py-0">
          <Mark
            title={t('appName')}
            className="h-[34vh] text-bone lg:h-[38vh]"
          />
        </div>

        <p className="text-center text-[0.95rem] leading-[1.9] font-bold text-bone/70 lg:text-start">
          {t('appTagline')}
        </p>
      </div>

      {/* The words' half: one bone panel, pulled up over the green on a phone
          so the two grounds interlock rather than stack. */}
      <div className="relative -mt-8 flex flex-col rounded-t-[28px] bg-bone px-6 pt-9 pb-28 sm:px-10 lg:mt-0 lg:min-h-dvh lg:justify-center lg:rounded-none lg:pb-28">
        <Wordmark
          title={t('appName')}
          className="mb-10 w-[190px] sm:w-[230px]"
        />

        <div className="max-w-[52ch]">
          <span className="inline-flex rounded-full bg-brand/10 px-4 py-1.5 text-[0.8rem] font-bold text-brand">
            {t('landing.eyebrow')}
          </span>
          <h1 className="mt-6 text-[clamp(2.1rem,5.5vw,3.4rem)] leading-[1.25] font-black text-balance text-brand">
            {t('landing.title')}
          </h1>
          <p className="mt-6 text-[1.05rem] leading-[1.95] font-normal text-ink">
            {t('landing.body')}
          </p>

          <div className="mt-10 hidden sm:block">
            <Link
              to="/sign-in"
              className="inline-flex items-center justify-center rounded-[14px] bg-brand px-8 py-4 text-[1rem] font-black text-bone transition active:scale-[0.98]"
            >
              {t('landing.cta')}
            </Link>
            <p className="mt-4 text-[0.9rem] font-normal text-ink/60">
              {t('auth.trust')}
            </p>
          </div>

          <p className="mt-10 border-t border-hairline pt-5 text-[0.88rem] font-normal text-ink/55">
            {t('landing.footer')}
          </p>
        </div>

        {/* The texture's one place on this page: the foot of the bone panel,
            below everything that has to be read and well clear of the logo. */}
        <div className="relative mt-8 h-24 shrink-0 overflow-hidden lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0">
          <MarkTexture className="absolute inset-0 size-full" />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-bone px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(92,79,74,0.1)] sm:hidden">
        <Link
          to="/sign-in"
          className="flex w-full items-center justify-center rounded-[14px] bg-brand py-3.5 text-[0.95rem] font-black text-bone"
        >
          {t('landing.cta')}
        </Link>
      </div>
    </div>
  )
}
