import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { getCustomerTotals, listCustomerConnections } from '#/db/queries/ledger'
import { paydayOnOrAfter } from '#/lib/payday'
import { AppBar } from '#/components/chrome'
import {
  Avatar,
  Card,
  KeyValueRow,
  StatTile,
  StatusPill,
} from '#/components/primitives'
import { OperationsCounter, PaydayStrip } from '#/components/ledger'
import { SideSwitch } from '#/components/side-switch'
import { SignOutButton } from '#/components/sign-out'
import { useI18n } from '#/i18n/context'

const loadShops = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSignedInUser } = await import('#/auth/session.server')
  const { getDatabase } = await import('#/db/client')
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
    nextPaydayAt: paydayOnOrAfter(now),
    roles: user.roles,
  }
})

/** UC-09: every shop one customer owes, and what they owe in total. */
export const Route = createFileRoute('/customer/')({
  beforeLoad: () => requireSide('customer'),
  loader: () => loadShops(),
  component: CustomerHome,
})

function CustomerHome() {
  const { totals, shops, roles, nextPaydayAt } = Route.useLoaderData()
  const { t, money, number, date } = useI18n()

  return (
    <>
      <AppBar
        actions={
          <>
            <SideSwitch roles={roles} side="customer" />
            <SignOutButton />
          </>
        }
      />
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
