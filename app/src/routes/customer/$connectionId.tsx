import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { buttonClass } from '#/components/chrome'
import { Pager, TransactionHistory, pagerLinkClass } from '#/components/account'
import {
  BalanceHero,
  OperationsCounter,
  PaydayStrip,
} from '#/components/ledger'
import { paydayOnOrAfter } from '#/lib/payday'
import { useI18n } from '#/i18n/context'

const loadAccount = createServerFn({ method: 'GET' })
  .validator((input: unknown): { connectionId: string; page: number } => {
    const raw = input as { connectionId?: unknown; page?: unknown }
    const page = Math.trunc(Number(raw.page))
    return {
      connectionId: String(raw.connectionId ?? ''),
      page: Number.isFinite(page) && page > 1 ? page : 1,
    }
  })
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const { readAccountPage } = await import('#/db/queries/account')
    const user = await requireSignedInUser()

    const now = new Date()
    const account = await readAccountPage(
      getDatabase(),
      data.connectionId,
      data.page,
      now,
    )

    // Someone else's account is not there, rather than there and refused.
    if (!account || account.summary.customerUserId !== user.id) return null

    return {
      ...account,
      page: data.page,
      now,
      nextPaydayAt: paydayOnOrAfter(now),
    }
  })

/** UC-09: one shop's history, as the customer who owes it sees it. */
export const Route = createFileRoute('/customer/$connectionId')({
  beforeLoad: () => requireSide('customer'),
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const page = Math.trunc(Number(search.page))
    return Number.isFinite(page) && page > 1 ? { page } : {}
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ params, deps }) => {
    const account = await loadAccount({
      data: { connectionId: params.connectionId, page: deps.page },
    })
    if (!account) throw notFound()
    return account
  },
  component: CustomerAccount,
})

function CustomerAccount() {
  const { summary, transactions, page, hasMore, now, nextPaydayAt } =
    Route.useLoaderData()
  const { t, money, date } = useI18n()

  return (
    <>
      <main className="p-3.5">
        <Link
          to="/customer"
          className="mb-3 inline-block text-[13px] font-black text-steel"
        >
          {t('nav.back')}
        </Link>

        <BalanceHero
          title={summary.merchantName}
          status={summary.status}
          balanceHalalas={summary.balanceHalalas}
          facts={[
            {
              label: t('ledger.creditLimit'),
              value: money(summary.limitHalalas),
            },
            {
              label: t('ledger.available'),
              value: money(summary.availableHalalas),
            },
            {
              label: t('ledger.dueDate'),
              value: summary.dueAt
                ? date(summary.dueAt)
                : t('ledger.noDueDate'),
            },
          ]}
        >
          <div className="relative z-1 mt-3">
            <PaydayStrip nextPaydayAt={nextPaydayAt} onDark />
          </div>
        </BalanceHero>

        <OperationsCounter
          purchases={summary.purchases}
          payments={summary.payments}
        />

        {summary.balanceHalalas > 0 ? (
          <Link
            to="/customer/pay/$connectionId"
            params={{ connectionId: summary.connectionId }}
            className={buttonClass('pay', 'mb-3')}
            data-testid="pay"
          >
            {t('pay.open')}
          </Link>
        ) : null}

        <TransactionHistory entries={transactions} now={now} />

        {page > 1 || hasMore ? (
          <Pager
            previous={
              <PagerLink
                connectionId={summary.connectionId}
                to={page - 1}
                disabled={page <= 1}
              >
                {t('page.previous')}
              </PagerLink>
            }
            next={
              <PagerLink
                connectionId={summary.connectionId}
                to={page + 1}
                disabled={!hasMore}
              >
                {t('page.next')}
              </PagerLink>
            }
          />
        ) : null}
      </main>
    </>
  )
}

function PagerLink({
  connectionId,
  to,
  disabled,
  children,
}: {
  connectionId: string
  to: number
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className={pagerLinkClass(true)} aria-disabled>
        {children}
      </span>
    )
  }

  return (
    <Link
      to="/customer/$connectionId"
      params={{ connectionId }}
      search={to > 1 ? { page: to } : {}}
      className={pagerLinkClass(false)}
    >
      {children}
    </Link>
  )
}
