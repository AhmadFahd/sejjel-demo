import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ConnectionRequests } from '#/components/connection-requests'
import { Pager, PagerPosition, pagerLinkClass } from '#/components/account'
import { getCustomerTotals, listCustomerConnections } from '#/db/queries/ledger'
import { paydayOnOrAfter } from '#/lib/payday'
import { buttonClass } from '#/components/chrome'
import {
  Avatar,
  Card,
  KeyValueRow,
  StatTile,
  StatusPill,
} from '#/components/primitives'
import { OperationsCounter, PaydayStrip } from '#/components/ledger'
import { useI18n } from '#/i18n/context'
import { requireSide } from '#/auth/enter'
import { WATCHED } from '#/lib/freshness'
import type { ReactNode } from 'react'

/** How many shops one screen of the list holds. */
const PAGE_SIZE = 25

const loadShops = createServerFn({ method: 'GET' })
  .validator((input: unknown): { page: number } => {
    const raw = input as { page?: unknown }
    const page = Math.trunc(Number(raw.page))
    return { page: Number.isFinite(page) && page > 1 ? page : 1 }
  })
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const { listAwaitingCustomer } = await import('#/db/queries/approval')
    const { listConnectionRequests } = await import('#/db/queries/connect')
    const user = await requireSignedInUser()

    const db = getDatabase()
    const now = new Date()

    // One moment for both, so the total and the pills under it cannot describe
    // two different days.
    const [totals, shops] = await Promise.all([
      getCustomerTotals(db, user.id, now),
      listCustomerConnections(db, user.id, now, {
        limit: PAGE_SIZE,
        offset: (data.page - 1) * PAGE_SIZE,
      }),
    ])

    // UC-12: a date comes round without anybody doing anything, so the screen
    // that has the figures is the one that notices it. The page in hand is
    // enough: somebody who owes more shops than fit on it sees the rest as
    // they page through them.
    const { noticeDueDates } = await import('#/db/queries/notifications')
    await noticeDueDates(db, { userId: user.id, summaries: shops, now })

    return {
      totals,
      shops,
      awaiting: await listAwaitingCustomer(db, user.id, now),
      requests: await listConnectionRequests(db, user.id),
      nextPaydayAt: paydayOnOrAfter(now),
      page: data.page,
      pages: Math.max(1, Math.ceil(totals.connections / PAGE_SIZE)),
    }
  })

/** UC-09: every shop one customer owes, and what they owe in total. */
export const Route = createFileRoute('/customer/')({
  ...WATCHED,
  // Page one carries no search parameter, so every other link to this screen
  // — a guard sending somebody back, the side switch — stays a bare
  // `/customer`.
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const page = Math.trunc(Number(search.page))
    return Number.isFinite(page) && page > 1 ? { page } : {}
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ deps, parentMatchPromise }) => {
    await requireSide(parentMatchPromise, 'customer')
    return loadShops({ data: { page: deps.page } })
  },
  component: CustomerHome,
})

function CustomerHome() {
  const { totals, shops, awaiting, requests, nextPaydayAt, page, pages } =
    Route.useLoaderData()
  const { t, money, number, date } = useI18n()

  return (
    <>
      <main className="p-3.5">
        <h1 className="mb-3 text-xl font-black text-ink">
          {t('role.customer')}
        </h1>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <StatTile
            label={t('ledger.shops')}
            value={number(totals.connections)}
          />
          <StatTile
            label={t('ledger.totalDebt')}
            value={money(totals.outstandingHalalas)}
            tone="brand"
          />
          <StatTile
            label={t('ledger.overdueTotal')}
            value={money(totals.overdueHalalas)}
            tone={totals.overdueHalalas > 0 ? 'bad' : 'plain'}
            marked={totals.overdueHalalas > 0}
          />
        </div>

        <Link
          to="/customer/card"
          className={buttonClass('ghost', 'mb-3')}
          data-testid="my-card-link"
        >
          {t('card.open')}
        </Link>

        <ConnectionRequests requests={requests} />

        {awaiting.map((operation) => (
          <Link
            key={operation.transactionId}
            to="/customer/approve/$transactionId"
            params={{ transactionId: operation.transactionId }}
            className="block"
            data-testid="awaiting"
          >
            <Card className="border-[1.5px] border-brand">
              <div className="mb-1 text-[13px] font-black text-warn-text">
                {t('approval.awaiting')}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-black text-ink">
                  {operation.merchantName}
                </span>
                <b className="tabular text-[15px] font-black text-ink">
                  {money(operation.amountHalalas)}
                </b>
              </div>
            </Card>
          </Link>
        ))}

        <Card className="p-4">
          <PaydayStrip nextPaydayAt={nextPaydayAt} />
        </Card>

        <OperationsCounter
          purchases={totals.purchases}
          payments={totals.payments}
        />

        {shops.length === 0 ? (
          <Card>
            <h2 className="mb-1 text-base font-black text-ink">
              {t('customer.noMerchants')}
            </h2>
            <p className="text-[13px] font-bold text-muted">
              {t('customer.noMerchantsBody')}
            </p>
          </Card>
        ) : (
          shops.map((row, index) => (
            <Link
              key={row.connectionId}
              to="/customer/$connectionId"
              params={{ connectionId: row.connectionId }}
              className="block"
              data-testid="connection-row"
            >
              <Card>
                <div className="mb-3 flex items-center gap-2.5">
                  <Avatar name={row.merchantName} index={index} />
                  <div className="flex-1 text-[15px] font-black text-ink">
                    {row.merchantName}
                  </div>
                  <StatusPill status={row.status} />
                </div>
                <KeyValueRow
                  label={t('ledger.balance')}
                  emphasis
                  tone={row.status === 'overdue' ? 'bad' : 'plain'}
                >
                  {money(row.balanceHalalas)}
                </KeyValueRow>
                <KeyValueRow label={t('ledger.dueDate')}>
                  {row.dueAt ? date(row.dueAt) : t('ledger.noDueDate')}
                </KeyValueRow>
              </Card>
            </Link>
          ))
        )}

        {pages < 2 ? null : (
          <Pager
            previous={
              <PagerLink to={page - 1} disabled={page <= 1}>
                {t('page.previous')}
              </PagerLink>
            }
            middle={<PagerPosition page={page} pages={pages} />}
            next={
              <PagerLink to={page + 1} disabled={page >= pages}>
                {t('page.next')}
              </PagerLink>
            }
          />
        )}
      </main>
    </>
  )
}

function PagerLink({
  to,
  disabled,
  children,
}: {
  to: number
  disabled: boolean
  children: ReactNode
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
      to="/customer"
      search={to > 1 ? { page: to } : {}}
      className={pagerLinkClass(false)}
    >
      {children}
    </Link>
  )
}
