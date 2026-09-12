import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { ConnectionRequests } from '#/components/connection-requests'
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

const loadShops = createServerFn({ method: 'GET' }).handler(async () => {
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
    listCustomerConnections(db, user.id, now),
  ])

  return {
    totals,
    shops,
    awaiting: await listAwaitingCustomer(db, user.id, now),
    requests: await listConnectionRequests(db, user.id),
    nextPaydayAt: paydayOnOrAfter(now),
  }
})

/** UC-09: every shop one customer owes, and what they owe in total. */
export const Route = createFileRoute('/customer/')({
  beforeLoad: () => requireSide('customer'),
  loader: () => loadShops(),
  component: CustomerHome,
})

function CustomerHome() {
  const { totals, shops, awaiting, requests, nextPaydayAt } =
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
            tone="gold"
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
            <Card className="border-[1.5px] border-gold">
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
      </main>
    </>
  )
}
