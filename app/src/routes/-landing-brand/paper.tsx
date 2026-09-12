import { Link } from '@tanstack/react-router'
import { Mark, Wordmark } from '#/components/brand'
import { LocaleToggle } from '#/components/locale-toggle'
import { useI18n } from '#/i18n/context'

/**
 * PROTOTYPE VARIANT A — «الورق» / Paper. Throwaway.
 *
 * The identity guide's own voice, turned into a front page: bone ground, one
 * measured column, hairline rules instead of cards, and the three claims
 * numbered the way the guide numbers its sections. No panel, no shadow, no
 * gradient, no fourth colour — the page is type and rules, and the only drawn
 * thing on it is the logo.
 *
 * What it argues: a ledger is a document, so the page that sells one should
 * read like a document and not like a software landing page.
 */
export function LandingPaper() {
  const { t, number } = useI18n()

  const claims = [
    t('auth.reason.record'),
    t('auth.reason.balance'),
    t('auth.reason.pay'),
  ]

  return (
    <div className="min-h-dvh bg-bone pb-28 text-word sm:pb-0">
      <div className="mx-auto max-w-[68ch] px-6 sm:px-8">
        <header className="flex items-start justify-between gap-4 pt-10 pb-12 sm:pt-16">
          <Wordmark title={t('appName')} className="w-[220px] sm:w-[300px]" />
          <LocaleToggle className="-me-2 shrink-0 text-brand hover:bg-brand/10" />
        </header>

        <p className="text-[0.95rem] font-bold text-word/60">
          {t('landing.eyebrow')}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,6vw,3.2rem)] leading-[1.3] font-black text-brand text-balance">
          {t('landing.title')}
        </h1>
        <p className="mt-6 text-[1.05rem] leading-[1.95] font-normal">
          {t('landing.body')}
        </p>

        <ol className="mt-12 border-t border-hairline">
          {claims.map((claim, index) => (
            <li
              key={claim}
              className="flex items-baseline gap-4 border-b border-hairline py-5"
            >
              <span className="w-6 shrink-0 text-[1rem] font-bold text-word/45 tabular-nums">
                {number(index + 1)}
              </span>
              <span className="text-[1.05rem] leading-[1.8] font-bold text-brand">
                {claim}
              </span>
            </li>
          ))}
        </ol>

        {/* The one action, at the size a sentence is — not a button shouting
            over the page it sits at the end of. */}
        <div className="hidden pt-12 sm:block">
          <Link
            to="/sign-in"
            className="group inline-flex items-baseline gap-3 text-[1.15rem] font-black text-brand underline decoration-hairline decoration-2 underline-offset-8 hover:decoration-brand"
          >
            <Mark className="h-6 self-center text-brand" />
            {t('landing.cta')}
          </Link>
          <p className="mt-4 text-[0.9rem] font-normal text-word/55">
            {t('auth.trust')}
          </p>
        </div>

        <footer className="mt-16 border-t border-hairline py-6 text-[0.88rem] font-normal text-word/55">
          {t('landing.footer')}
        </footer>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-bone px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
        <Link
          to="/sign-in"
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-3.5 text-[0.95rem] font-black text-bone"
        >
          {t('landing.cta')}
        </Link>
      </div>
    </div>
  )
}
