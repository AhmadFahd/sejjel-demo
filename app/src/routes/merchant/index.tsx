import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { localSaudiMobile } from '#/auth/phone'
import { requireSide } from '#/auth/enter'
import { getMerchantTotals, listMerchantConnections } from '#/db/queries/ledger'
import { paydayOnOrAfter } from '#/lib/payday'
import { buttonClass } from '#/components/chrome'
import {
  Avatar,
  Card,
  KeyValueRow,
  MobileNumber,
  StatTile,
  StatusPill,
  cx,
} from '#/components/primitives'
import { OperationsCounter, PaydayStrip } from '#/components/ledger'
import { QrCanvas } from '#/components/qr-canvas'
import { shopUrl } from './qr'
import { useI18n } from '#/i18n/context'
import { WATCHED } from '#/lib/freshness'

/** How many customers one screen of the list holds. */
const PAGE_SIZE = 25

const loadShop = createServerFn({ method: 'GET' })
  .validator((input: unknown): { page: number } => {
    const raw = input as { page?: unknown }
    const page = Math.trunc(Number(raw.page))
    return { page: Number.isFinite(page) && page > 1 ? page : 1 }
  })
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop) return null

    const db = getDatabase()
    const now = new Date()
    const offset = (data.page - 1) * PAGE_SIZE

    // Both queries read the same moment, so the figures and the pills below
    // them cannot describe two different days.
    const [totals, customers] = await Promise.all([
      getMerchantTotals(db, shop.id, now),
      listMerchantConnections(db, shop.id, now, {
        limit: PAGE_SIZE,
        offset,
      }),
    ])

    // UC-12: a date comes round without anybody doing anything, so the screen
    // that has the figures is the one that notices it. The page in hand is
    // enough: a shop with more customers than fit on it sees the rest as it
    // pages through them.
    const { noticeDueDates } = await import('#/db/queries/notifications')
    await noticeDueDates(db, { userId: user.id, summaries: customers, now })

    return {
      shop,
      totals,
      customers,
      page: data.page,
      pages: Math.max(1, Math.ceil(totals.connections / PAGE_SIZE)),
      nextPaydayAt: paydayOnOrAfter(now),
    }
  })

/** UC-02: the shop's position, and every customer in it. */
export const Route = createFileRoute('/merchant/')({
  ...WATCHED,
  // Page one carries no search parameter, so every other link to the shop —
  // a guard sending someone back, the side switch — stays a bare `/merchant`.
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const page = Math.trunc(Number(search.page))
    return Number.isFinite(page) && page > 1 ? { page } : {}
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ deps, parentMatchPromise }) => {
    await requireSide(parentMatchPromise, 'merchant')
    return loadShop({ data: { page: deps.page } })
  },
  component: MerchantHome,
})

function MerchantHome() {
  const data = Route.useLoaderData()
  const { t, money, number, date } = useI18n()
  if (!data) return null

  const { totals } = data

  return (
    <>
      <main className="p-3.5">
        <h1 className="mb-3 text-xl font-black text-ink">{data.shop.name}</h1>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <StatTile
            label={t('ledger.customers')}
            value={number(totals.connections)}
          />
          <StatTile
            label={t('ledger.outstanding')}
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

        <Card className="p-4">
          <PaydayStrip nextPaydayAt={data.nextPaydayAt} />
        </Card>

        <Link
          to="/merchant/record"
          className={buttonClass('primary', 'mb-3')}
          data-testid="record"
        >
          {t('operation.new')}
        </Link>

        {/* UC-16: the shop's own code, for the counter. Small here, and one
            press from being big enough to scan across a counter. */}
        <Card>
          <div className="flex items-center gap-3.5">
            <QrCanvas
              value={shopUrl(data.shop.id)}
              size={96}
              testId="shop-qr"
            />
            <div>
              <h2 className="mb-1 text-[15px] font-black text-ink">
                {t('shop.counter')}
              </h2>
              <p className="mb-2 text-[12px] font-bold text-muted">
                {t('shop.counterBody')}
              </p>
              <Link
                to="/merchant/qr"
                className="text-[12.5px] font-black text-steel"
                data-testid="shop-qr-open"
              >
                {t('shop.counterOpen')}
              </Link>
            </div>
          </div>
        </Card>

        {/* #35: the count of the operations is the way into them, as it is
            in the prototype. */}
        <OperationsCounter
          purchases={totals.purchases}
          payments={totals.payments}
          to="/merchant/log"
        />

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
          data.customers.map((row, index) => (
            <Link
              key={row.connectionId}
              to="/merchant/$connectionId"
              params={{ connectionId: row.connectionId }}
              className="block"
              data-testid="connection-row"
            >
              <Card>
                <div className="mb-3 flex items-center gap-2.5">
                  <Avatar name={row.customerName} index={index} />
                  <div className="flex-1">
                    <div className="text-[15px] font-black text-ink">
                      {row.customerName}
                    </div>
                    <MobileNumber>
                      {localSaudiMobile(row.customerMobile)}
                    </MobileNumber>
                  </div>
                  {/* UC-13: a customer standing on their own figures rather
                      than the shop's is marked, as the prototype marks them. */}
                  {row.limitOverrideHalalas !== null ||
                  row.termOverrideDays !== null ? (
                    <span
                      className="text-[10.5px] font-black whitespace-nowrap text-brand"
                      data-testid="overridden"
                    >
                      {t('settings.overridden')}
                    </span>
                  ) : null}
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

        <Pager page={data.page} pages={data.pages} />
      </main>
    </>
  )
}

/**
 * The list is paged rather than loaded whole, so a shop with a few hundred
 * customers costs the same to open as a shop with three.
 */
function Pager({ page, pages }: { page: number; pages: number }) {
  const { t, number } = useI18n()
  if (pages < 2) return null

  return (
    <nav
      className="flex items-center justify-between gap-2 py-2"
      data-testid="pager"
    >
      <PagerLink to={page - 1} disabled={page <= 1}>
        {t('page.previous')}
      </PagerLink>
      <span className="text-[12px] font-bold text-muted">
        {t('page.position', { page: number(page), pages: number(pages) })}
      </span>
      <PagerLink to={page + 1} disabled={page >= pages}>
        {t('page.next')}
      </PagerLink>
    </nav>
  )
}

function PagerLink({
  to,
  disabled,
  children,
}: {
  to: number
  disabled: boolean
  children: React.ReactNode
}) {
  const className = cx(
    'rounded-(--radius-control) px-3 py-2 text-[13px] font-black',
    disabled ? 'text-muted opacity-50' : 'bg-neutral-bg text-ink',
  )

  if (disabled) {
    return (
      <span className={className} aria-disabled>
        {children}
      </span>
    )
  }

  return (
    <Link
      to="/merchant"
      search={to > 1 ? { page: to } : {}}
      className={className}
    >
      {children}
    </Link>
  )
}
