import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { loadSignedInUser } from '#/auth/session'
import { homeFor } from '#/auth/roles'
import { Mark, ShaddaTexture, Wordmark } from '#/components/brand'
import { LocaleToggle } from '#/components/locale-toggle'
import { paydayOnOrAfter } from '#/lib/payday'
import { useI18n } from '#/i18n/context'
import { SETTLED } from '#/lib/freshness'

/**
 * A made-up page of the ledger, for the public page to show. The figures are
 * kept consistent: the purchase less the payment is the balance.
 */
const SHEET = {
  purchaseHalalas: 100_000,
  paymentHalalas: 20_000,
  balanceHalalas: 80_000,
  /** How long before the due date each line was written. */
  purchaseDaysBefore: 34,
  paymentDaysBefore: 27,
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The public page, and the front door for everybody else: a person already on
 * a side of the ledger is sent to it rather than shown the pitch for the thing
 * they are already using.
 */
export const Route = createFileRoute('/')({
  ...SETTLED,
  beforeLoad: async () => {
    const user = await loadSignedInUser()
    if (user) throw redirect({ to: homeFor(user.roles) })
  },
  /**
   * The dates on the sheet, worked out where the page is rendered rather than
   * written into it: a hard-coded month goes stale, and a clock read while
   * drawing would disagree with the one that drew it on the server.
   */
  loader: () => {
    const dueAt = paydayOnOrAfter(new Date())
    return {
      dueAt,
      purchaseAt: new Date(dueAt.getTime() - SHEET.purchaseDaysBefore * DAY_MS),
      paymentAt: new Date(dueAt.getTime() - SHEET.paymentDaysBefore * DAY_MS),
    }
  },
  component: Landing,
})

function Landing() {
  const { t, money, date } = useI18n()
  const { dueAt, purchaseAt, paymentAt } = Route.useLoaderData()

  return (
    <div className="min-h-dvh bg-bone pb-28 sm:pb-0">
      <div className="mx-auto max-w-[760px] px-5 sm:px-8">
        <header className="flex items-center justify-between gap-4 py-7">
          <Wordmark title={t('appName')} className="w-[150px] sm:w-[180px]" />
          <div className="flex items-center gap-2">
            <LocaleToggle className="text-brand hover:bg-brand/10" />
            <Link
              to="/sign-in"
              className="rounded-full border-[1.5px] border-brand px-4 py-1.5 text-[0.8rem] font-black text-brand"
            >
              {t('auth.title')}
            </Link>
          </div>
        </header>

        <h1 className="text-[clamp(1.7rem,4.5vw,2.6rem)] leading-[1.3] font-black text-balance text-brand">
          {t('landing.title')}
        </h1>
        <p className="mt-4 max-w-[56ch] text-[1rem] leading-[1.9] font-normal text-ink">
          {t('landing.body')}
        </p>

        {/* The sheet. Its head names whose page this is. */}
        <section className="mt-10 overflow-hidden rounded-[14px] border border-hairline">
          <div className="flex items-baseline justify-between gap-3 border-b border-hairline bg-brand/[0.06] px-5 py-3.5">
            <span className="text-[0.95rem] font-black text-brand">
              {t('landing.mockShop')}
            </span>
            <span className="text-[0.8rem] font-normal text-ink/60">
              {t('payday.title')}
            </span>
          </div>

          <Row
            when={date(purchaseAt)}
            what={t('ledger.purchases')}
            amount={money(SHEET.purchaseHalalas)}
          />
          <Row
            when={date(paymentAt)}
            what={t('ledger.payments')}
            amount={money(SHEET.paymentHalalas)}
          />
          <Row
            when={date(dueAt)}
            what={t('ledger.dueDate')}
            amount={money(SHEET.balanceHalalas)}
            pending
          />

          {/* The closing line, the way a page of a ledger closes. */}
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-brand/25 px-5 py-4">
            <span className="text-[0.9rem] font-bold text-ink/70">
              {t('ledger.balance')}
            </span>
            <b className="tabular text-[1.5rem] font-black text-brand">
              {money(SHEET.balanceHalalas)}
            </b>
          </div>

          {/* The last line of the sheet is the action: signing in is the next
              entry, not a separate errand. The phone gets it as a bar instead,
              where it stays in reach. */}
          <Link
            to="/sign-in"
            className="hidden items-center justify-between gap-3 bg-brand px-5 py-4 text-bone transition active:brightness-95 sm:flex"
          >
            <span className="text-[0.98rem] font-black">
              {t('landing.cta')}
            </span>
            <span className="text-[1.1rem] leading-none font-black rtl:-scale-x-100">
              →
            </span>
          </Link>

          {/* The shadda texture at the foot of the sheet, which is the use the
              guide puts the finer of the two patterns to: a small area, the
              back of a card, and never behind anything that has to be read. */}
          <div className="relative h-12 border-t border-hairline">
            <ShaddaTexture unit={0.45} className="absolute inset-0 size-full" />
          </div>
        </section>

        <p className="mt-4 text-[0.88rem] font-normal text-ink/60">
          {t('auth.trust')}
        </p>

        <footer className="mt-12 border-t border-hairline py-6 text-[0.88rem] font-normal text-ink/55">
          {t('landing.footer')}
        </footer>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-bone px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
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

/**
 * One line of the sheet. A line both sides have agreed carries the mark; one
 * still waiting for the other side gets a dashed ring instead.
 */
function Row({
  when,
  what,
  amount,
  pending = false,
}: {
  when: string
  what: string
  amount: string
  pending?: boolean
}) {
  return (
    <div className="flex items-center gap-3 border-b border-hairline px-5 py-3.5 last:border-b-0">
      <span className="tabular w-[88px] shrink-0 text-[0.8rem] font-normal text-ink/55 sm:w-[110px]">
        {when}
      </span>
      <span className="flex-1 text-[0.92rem] font-bold text-ink">{what}</span>
      {pending ? (
        <span className="size-6 shrink-0 rounded-full border-[1.5px] border-dashed border-ink/30" />
      ) : (
        <Mark className="h-6 shrink-0 text-brand" />
      )}
      <b className="tabular w-[110px] shrink-0 text-end text-[0.95rem] font-black text-brand">
        {amount}
      </b>
    </div>
  )
}
