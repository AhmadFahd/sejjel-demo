import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { AppBar } from '#/components/chrome'
import { Card } from '#/components/primitives'
import {
  BalanceHero,
  OperationsCounter,
  PaydayStrip,
  TransactionRow,
} from '#/components/ledger'
import { paydayOnOrAfter } from '#/lib/payday'
import { useI18n } from '#/i18n/context'

/** How many operations one screen of the history holds. */
const PAGE_SIZE = 25

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
    const { getConnectionSummary, listTransactions } =
      await import('#/db/queries/ledger')
    const user = await requireSignedInUser()

    const db = getDatabase()
    const now = new Date()
    const summary = await getConnectionSummary(db, data.connectionId, now)

    // Someone else's account is not there, rather than there and refused.
    if (!summary || summary.customerUserId !== user.id) return null

    // One row more than the page is asked for: whether it came back is the
    // answer to whether there is a next page, without counting the history.
    const rows = await listTransactions(db, data.connectionId, {
      limit: PAGE_SIZE + 1,
      offset: (data.page - 1) * PAGE_SIZE,
    })

    return {
      summary,
      transactions: rows.slice(0, PAGE_SIZE),
      page: data.page,
      hasMore: rows.length > PAGE_SIZE,
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
  const { summary, transactions, page, hasMore, nextPaydayAt } =
    Route.useLoaderData()
  const { t, money, date, time } = useI18n()

  return (
    <>
      <AppBar />
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

        {transactions.length === 0 ? (
          <Card>
            <p className="text-[13px] font-bold text-muted">
              {t('ledger.noOperations')}
            </p>
          </Card>
        ) : (
          <Card data-testid="transactions">
            {transactions.map((entry) => (
              <TransactionRow
                key={entry.id}
                kind={entry.kind}
                title={
                  entry.description ??
                  (entry.kind === 'purchase'
                    ? t('tx.purchase')
                    : t('tx.payment'))
                }
                when={`${date(entry.createdAt)} · ${time(entry.createdAt)}`}
                amountHalalas={entry.amountHalalas}
              />
            ))}
          </Card>
        )}

        {page > 1 || hasMore ? (
          <nav
            className="flex items-center justify-between gap-2 py-2"
            data-testid="pager"
          >
            <PagerLink
              connectionId={summary.connectionId}
              to={page - 1}
              disabled={page <= 1}
            >
              {t('page.previous')}
            </PagerLink>
            <PagerLink
              connectionId={summary.connectionId}
              to={page + 1}
              disabled={!hasMore}
            >
              {t('page.next')}
            </PagerLink>
          </nav>
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
  const className =
    'rounded-(--radius-control) px-3 py-2 text-[13px] font-black ' +
    (disabled ? 'text-muted opacity-50' : 'bg-neutral-bg text-ink')

  if (disabled) {
    return (
      <span className={className} aria-disabled>
        {children}
      </span>
    )
  }

  return (
    <Link
      to="/customer/$connectionId"
      params={{ connectionId }}
      search={to > 1 ? { page: to } : {}}
      className={className}
    >
      {children}
    </Link>
  )
}
