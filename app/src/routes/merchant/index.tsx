import { createFileRoute } from '@tanstack/react-router'
import { requireSide } from '#/auth/guard'
import { listMerchantConnections } from '#/db/queries/ledger'
import { createServerFn } from '@tanstack/react-start'
import { AppBar } from '#/components/chrome'
import { Card } from '#/components/primitives'
import { SideSwitch } from '#/components/side-switch'
import { SignOutButton } from '#/components/sign-out'
import { useI18n } from '#/i18n/context'

const loadShop = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSignedInUser } = await import('#/auth/session.server')
  const { getDatabase } = await import('#/db/client')
  const user = await requireSignedInUser()
  const shop = user.roles.merchant
  if (!shop) return null

  return {
    shop,
    customers: await listMerchantConnections(getDatabase(), shop.id),
    roles: user.roles,
  }
})

/** A placeholder until UC-02 builds the real thing. */
export const Route = createFileRoute('/merchant/')({
  beforeLoad: () => requireSide('merchant'),
  loader: () => loadShop(),
  component: MerchantHome,
})

function MerchantHome() {
  const data = Route.useLoaderData()
  const { t, money } = useI18n()
  if (!data) return null

  return (
    <>
      <AppBar
        actions={
          <>
            <SideSwitch roles={data.roles} side="merchant" />
            <SignOutButton />
          </>
        }
      />
      <main className="p-3.5">
        <h1 className="mb-3 text-xl font-black text-ink">{data.shop.name}</h1>

        {data.customers.length === 0 ? (
          <Card>
            <h2 className="mb-1 text-base font-black text-ink">
              {t('merchant.noCustomers')}
            </h2>
            <p className="text-[13px] font-bold text-muted">
              {t('merchant.noCustomersBody')}
            </p>
          </Card>
        ) : (
          data.customers.map((row) => (
            <Card key={row.connectionId}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-black text-ink">
                  {row.customerName}
                </span>
                <b className="tabular text-[15px] font-black text-ink">
                  {money(row.balanceHalalas)}
                </b>
              </div>
            </Card>
          ))
        )}
      </main>
    </>
  )
}
