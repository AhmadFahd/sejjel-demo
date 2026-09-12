import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { loadSignedInUser } from '#/auth/session'
import { homeFor } from '#/auth/roles'
import { LocaleToggle } from '#/components/locale-toggle'
import { useI18n } from '#/i18n/context'
import { PrototypeSwitcher } from '#/components/prototype-switcher'
import { LandingPaper } from './-landing-brand/paper'
import { LandingField } from './-landing-brand/field'
import { LandingLedger } from './-landing-brand/ledger'

/** What the phone in the hero is showing. A picture of the thing, not data. */
const MOCK_BALANCE_HALALAS = 80_000
const MOCK_LIMIT_PERCENT = 68

/**
 * PROTOTYPE, and throwaway — everything under `-landing-brand/`, the switcher,
 * and the `variant` parameter go once one of them wins.
 *
 * The question: what does this page look like when it is built from
 * `brand/identity-ar.html` rather than from the tokens the prototype inherited?
 * Three variants of the public page, switchable via `?variant=`, on the
 * existing `/` route. `current` is the page as it stands today, so the brand
 * ones are judged against it and not against a memory of it.
 */
const VARIANTS = [
  { key: 'current', name: 'As it stands today' },
  // The names read in English: this bar is scaffolding for whoever is
  // choosing, not copy, and it is never translated or shipped.
  { key: 'paper', name: 'Paper — a document, rules not cards' },
  { key: 'field', name: 'Field — green ground, mark at poster size' },
  { key: 'ledger', name: 'Ledger — the sheet is the pitch' },
]

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await loadSignedInUser()
    if (user) throw redirect({ to: homeFor(user.roles) })
  },
  validateSearch: (search: Record<string, unknown>): { variant?: string } => {
    const variant = search.variant
    return typeof variant === 'string' &&
      VARIANTS.some((candidate) => candidate.key === variant)
      ? { variant }
      : {}
  },
  component: LandingRoute,
})

function LandingRoute() {
  const search = Route.useSearch()
  const variant = search.variant ?? 'current'
  const navigate = useNavigate({ from: '/' })

  return (
    <>
      {variant === 'paper' ? <LandingPaper /> : null}
      {variant === 'field' ? <LandingField /> : null}
      {variant === 'ledger' ? <LandingLedger /> : null}
      {variant === 'current' ? <Landing /> : null}

      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        chosen={search.variant !== undefined}
        onPick={(key) =>
          void navigate({
            search: key === 'current' ? {} : { variant: key },
            replace: true,
          })
        }
      />
    </>
  )
}

/**
 * The public page, and the front door for everybody else: a person already on
 * a side of the ledger is sent to it rather than shown the pitch for the thing
 * they are already using.
 */
function Landing() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-dvh flex-col bg-mist pb-24 sm:pb-0">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-5 py-3.5 sm:px-8">
          <span
            className="grid size-10 flex-none place-items-center rounded-[13px] bg-linear-135 from-gold-light via-gold to-gold-dark text-lg font-black text-ink"
            aria-hidden
          >
            {t('appName').slice(0, 1)}
          </span>
          <div>
            <div className="text-[19px] leading-none font-black">
              {t('appName')}
            </div>
            <div className="hidden text-[10.5px] font-bold text-white/70 sm:block">
              {t('appTagline')}
            </div>
          </div>

          <div className="ms-auto flex items-center gap-1">
            <LocaleToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
            <Link
              to="/sign-in"
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-[13px] font-black whitespace-nowrap text-ink transition active:scale-[0.98]"
            >
              {t('auth.title')}
            </Link>
          </div>
        </div>
      </header>

      {/* The hero takes whatever the screen has left, so a tall monitor does
          not end the page halfway down with a band of nothing under it. */}
      <section className="flex flex-1 items-center bg-ink text-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:pb-20">
          <div>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-gold-light">
              {t('landing.eyebrow')}
            </span>
            <h1 className="mt-4 text-[30px] leading-[1.15] font-black sm:text-[40px] lg:text-[52px]">
              {t('landing.title')}
            </h1>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed font-bold text-white/75 sm:text-[16px]">
              {t('landing.body')}
            </p>
            <div className="mt-7 hidden sm:block">
              <Link to="/sign-in" className={CALL_TO_ACTION}>
                {t('landing.cta')}
              </Link>
            </div>
            <p className="mt-4 text-[12px] font-bold text-white/50">
              {t('auth.trust')}
            </p>
          </div>

          {/* A screen of the thing, rather than a promise about it. */}
          <PhoneMock />
        </div>
      </section>

      <footer className="border-t border-line bg-mist">
        <div className="mx-auto max-w-6xl px-5 py-7 text-[12px] font-bold text-muted sm:px-8">
          {t('landing.footer')}
        </div>
      </footer>

      {/* On a phone the one action stays in reach, the way the dock does on
          the screens behind sign-in. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <Link to="/sign-in" className={`${CALL_TO_ACTION} w-full`}>
          {t('landing.cta')}
        </Link>
      </div>
    </div>
  )
}

const CALL_TO_ACTION =
  'inline-flex items-center justify-center rounded-(--radius-control) bg-linear-135 from-gold-light to-gold px-6 py-3.5 text-[14.5px] font-black text-ink transition active:scale-[0.98]'

/**
 * The app's own card, at the size it is read on. The figures are a fixture, so
 * they are formatted the way real ones are rather than written out per
 * language: a page that shows Arabic numerals in one column and Western ones
 * in the other has already lost the argument it is making.
 */
function PhoneMock() {
  const { t, money, number } = useI18n()

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="rounded-[34px] border-[6px] border-black/40 bg-mist p-3 shadow-2xl shadow-black/40">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="grid size-8 place-items-center rounded-[11px] bg-linear-135 from-gold-light via-gold to-gold-dark text-[15px] font-black text-ink"
            aria-hidden
          >
            {t('appName').slice(0, 1)}
          </span>
          <span className="text-[13px] font-black text-ink">
            {t('landing.mockShop')}
          </span>
        </div>

        <div className="rounded-(--radius-card) bg-card p-4 shadow-(--shadow-card)">
          <div className="text-[11px] font-extrabold text-muted">
            {t('ledger.balance')}
          </div>
          <div className="tabular mt-1 text-[26px] font-black text-ink">
            {money(MOCK_BALANCE_HALALAS)}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-bg">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${MOCK_LIMIT_PERCENT}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] font-bold text-muted">
            {t('landing.mockLimit', { percent: number(MOCK_LIMIT_PERCENT) })}
          </div>
        </div>

        <div className="mt-2 rounded-(--radius-control) border border-gold/20 bg-linear-135 from-warn-bg to-white p-3">
          <div className="text-[12px] font-black text-ink">
            {t('payday.title')}
          </div>
        </div>
      </div>
    </div>
  )
}
