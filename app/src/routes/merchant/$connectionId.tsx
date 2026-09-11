import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { localSaudiMobile } from '#/auth/phone'
import { AppBar } from '#/components/chrome'
import { MobileNumber } from '#/components/primitives'
import { Pager, TransactionHistory, pagerLinkClass } from '#/components/account'
import { BalanceHero, LimitBar, OperationsCounter } from '#/components/ledger'
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
    const shop = user.roles.merchant
    if (!shop) return null

    const account = await readAccountPage(
      getDatabase(),
      data.connectionId,
      data.page,
    )

    // Another shop's customer is not there, rather than there and refused.
    if (!account || account.summary.merchantId !== shop.id) return null

    return { ...account, page: data.page }
  })

/** UC-03: one customer's whole account, as the shop sees it. */
export const Route = createFileRoute('/merchant/$connectionId')({
  beforeLoad: () => requireSide('merchant'),
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
  component: MerchantAccount,
})

function MerchantAccount() {
  const { summary, transactions, page, hasMore } = Route.useLoaderData()
  const { t, money, date } = useI18n()

  return (
    <>
      <AppBar />
      <main className="p-3.5">
        <Link
          to="/merchant"
          className="mb-3 inline-block text-[13px] font-black text-steel"
        >
          {t('nav.back')}
        </Link>

        <BalanceHero
          title={summary.customerName}
          subtitle={
            <MobileNumber onDark>
              {localSaudiMobile(summary.customerMobile)}
            </MobileNumber>
          }
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
          <LimitBar
            usedHalalas={summary.balanceHalalas}
            limitHalalas={summary.limitHalalas}
            onDark
          />
        </BalanceHero>

        <OperationsCounter
          purchases={summary.purchases}
          payments={summary.payments}
        />

        <TransactionHistory entries={transactions} />

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
      to="/merchant/$connectionId"
      params={{ connectionId }}
      search={to > 1 ? { page: to } : {}}
      className={pagerLinkClass(false)}
    >
      {children}
    </Link>
  )
}
