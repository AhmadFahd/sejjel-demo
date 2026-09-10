import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { listCustomerConnections } from '#/db/queries/ledger'
import { paydayOnOrAfter } from '#/lib/payday'
import { AppBar } from '#/components/chrome'
import { Card, KeyValueRow, StatusPill } from '#/components/primitives'
import { PaydayStrip } from '#/components/ledger'
import { SideSwitch } from '#/components/side-switch'
import { SignOutButton } from '#/components/sign-out'
import { useI18n } from '#/i18n/context'

const loadShops = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSignedInUser } = await import('#/auth/session.server')
  const { getDatabase } = await import('#/db/client')
  const user = await requireSignedInUser()

  const now = new Date()
  return {
    shops: await listCustomerConnections(getDatabase(), user.id, now),
    nextPaydayAt: paydayOnOrAfter(now),
    roles: user.roles,
  }
})

/** A placeholder until UC-09 builds the real thing. */
export const Route = createFileRoute('/customer/')({
  beforeLoad: () => requireSide('customer'),
  loader: () => loadShops(),
  component: CustomerHome,
})

function CustomerHome() {
  const { shops, roles, nextPaydayAt } = Route.useLoaderData()
  const { t, money, date } = useI18n()

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

        <Card className="p-4">
          <PaydayStrip nextPaydayAt={nextPaydayAt} />
        </Card>

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
          shops.map((row) => (
            <Card key={row.connectionId} data-testid="connection-row">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[15px] font-black text-ink">
                  {row.merchantName}
                </span>
                <StatusPill status={row.status} />
              </div>
              <KeyValueRow label={t('ledger.balance')} emphasis>
                {money(row.balanceHalalas)}
              </KeyValueRow>
              <KeyValueRow label={t('ledger.dueDate')}>
                {row.dueAt ? date(row.dueAt) : t('ledger.noDueDate')}
              </KeyValueRow>
            </Card>
          ))
        )}
      </main>
    </>
  )
}
