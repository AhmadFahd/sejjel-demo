import { useEffect, useState } from 'react'
import {
  Link,
  createFileRoute,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSideOf } from '#/auth/enter'
import { localSaudiMobile } from '#/auth/phone'
import { Pager, pagerLinkClass } from '#/components/account'
import { LoadingDots } from '#/components/loading'
import { Card, KeyValueRow, MobileNumber, cx } from '#/components/primitives'
import { useI18n } from '#/i18n/context'
import type { LogEntry } from '#/db/queries/log'

type Search = {
  q?: string
  kind?: 'purchase' | 'payment'
  from?: string
  to?: string
  page?: number
}

const isKind = (value: unknown): value is 'purchase' | 'payment' =>
  value === 'purchase' || value === 'payment'

/** A date as the browser's own date field writes it, and nothing else. */
const asDay = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : undefined

const loadLog = createServerFn({ method: 'GET' })
  .validator((input: unknown): Search => {
    const raw = input as Record<string, unknown>
    const page = Math.trunc(Number(raw.page))
    return {
      q: typeof raw.q === 'string' && raw.q.trim() ? raw.q.trim() : undefined,
      kind: isKind(raw.kind) ? raw.kind : undefined,
      from: asDay(raw.from),
      to: asDay(raw.to),
      page: Number.isFinite(page) && page > 1 ? page : 1,
    }
  })
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const { listShopOperations, shopHasOperations } =
      await import('#/db/queries/log')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop) return null

    const db = getDatabase()
    const found = await listShopOperations(db, {
      merchantId: shop.id,
      search: data.q,
      kind: data.kind,
      from: data.from ? new Date(`${data.from}T00:00:00Z`) : undefined,
      to: data.to ? new Date(`${data.to}T00:00:00Z`) : undefined,
      page: data.page,
    })

    return {
      ...found,
      page: data.page ?? 1,
      // An empty shop and a search that found nothing are different things,
      // and only the database can tell them apart.
      everHad:
        found.entries.length > 0 || (await shopHasOperations(db, shop.id)),
    }
  })

/** Every operation in the shop, searchable, a page at a time. */
export const Route = createFileRoute('/merchant/log')({
  beforeLoad: ({ context }) => requireSideOf(context.person, 'merchant'),
  validateSearch: (search: Record<string, unknown>): Search => {
    const page = Math.trunc(Number(search.page))
    return {
      ...(typeof search.q === 'string' && search.q ? { q: search.q } : {}),
      ...(isKind(search.kind) ? { kind: search.kind } : {}),
      ...(asDay(search.from) ? { from: String(search.from) } : {}),
      ...(asDay(search.to) ? { to: String(search.to) } : {}),
      ...(Number.isFinite(page) && page > 1 ? { page } : {}),
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadLog({ data: deps }),
  // #75: no `pendingComponent` here, deliberately. The search is typed into
  // this screen, and a new search is a new set of loader deps, so it is a new
  // match: a loader standing in front of it would unmount the field mid-word
  // and take the keyboard with it. The rows a person is reading stay where
  // they are, and the dots beside the field say a newer answer is coming.
  component: OperationsLog,
})

function OperationsLog() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const { t } = useI18n()

  if (!data) return null

  return (
    <main className="p-3.5">
      <Link
        to="/merchant"
        className="mb-3 inline-block text-[13px] font-black text-steel"
      >
        {t('nav.back')}
      </Link>
      <h1 className="mb-1 text-xl font-black text-ink">{t('log.title')}</h1>
      <p className="mb-3 text-[12.5px] font-bold text-muted">{t('log.body')}</p>

      <Filters search={search} />

      {data.entries.length === 0 ? (
        <Card data-testid={data.everHad ? 'log-no-results' : 'log-empty'}>
          <h2 className="text-base font-black text-ink">
            {t(data.everHad ? 'log.noResults' : 'log.empty')}
          </h2>
          {/* A shop with nothing in it has been told that; a search that
              found nothing has somewhere to go next. */}
          {data.everHad ? (
            <p className="mt-1 text-[13px] font-bold text-muted">
              {t('log.noResultsBody')}
            </p>
          ) : null}
        </Card>
      ) : (
        <div data-testid="log">
          {data.entries.map((entry) => (
            <LogRow key={entry.transactionId} entry={entry} />
          ))}
        </div>
      )}

      {data.page > 1 || data.hasMore ? (
        <Pager
          previous={
            <PagerLink
              search={search}
              to={data.page - 1}
              disabled={data.page <= 1}
            >
              {t('page.previous')}
            </PagerLink>
          }
          next={
            <PagerLink
              search={search}
              to={data.page + 1}
              disabled={!data.hasMore}
            >
              {t('page.next')}
            </PagerLink>
          }
        />
      ) : null}
    </main>
  )
}

/**
 * The search is in the URL, so it is the database that answers it and the
 * screen can be handed to somebody else exactly as it was read.
 */
function Filters({ search }: { search: Search }) {
  const { t } = useI18n()
  const router = useRouter()
  const working = useRouterState({ select: (state) => state.isLoading })
  const [typed, setTyped] = useState(search.q ?? '')

  useEffect(() => setTyped(search.q ?? ''), [search.q])

  // A pause rather than a keystroke: every letter typed is otherwise a query
  // and a page of rows nobody has finished asking for.
  useEffect(() => {
    const wanted = typed.trim()
    if (wanted === (search.q ?? '')) return

    const timer = setTimeout(() => {
      void router.navigate({
        to: '/merchant/log',
        search: { ...search, q: wanted || undefined, page: undefined },
        replace: true,
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [typed, search, router])

  const move = (next: Partial<Search>) =>
    void router.navigate({
      to: '/merchant/log',
      search: { ...search, ...next, page: undefined },
    })

  const field =
    'w-full rounded-(--radius-control) border border-neutral-bg px-3 py-2.5 text-[13px]'

  return (
    <Card>
      <div className="relative">
        <input
          type="search"
          aria-label={t('log.search')}
          placeholder={t('log.search')}
          className={field}
          data-testid="log-search"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        {working ? (
          <span className="absolute inset-y-0 end-3 flex items-center">
            <LoadingDots />
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex gap-2">
        {(['purchase', 'payment'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            data-testid={`log-kind-${kind}`}
            aria-pressed={search.kind === kind}
            className={cx(
              'rounded-full px-3 py-1.5 text-[12px] font-black',
              search.kind === kind
                ? 'bg-ink text-white'
                : 'bg-neutral-bg text-ink',
            )}
            onClick={() =>
              move({ kind: search.kind === kind ? undefined : kind })
            }
          >
            {t(`tx.${kind}`)}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          type="date"
          aria-label={t('log.from')}
          className={field}
          data-testid="log-from"
          value={search.from ?? ''}
          onChange={(event) => move({ from: event.target.value || undefined })}
        />
        <input
          type="date"
          aria-label={t('log.to')}
          className={field}
          data-testid="log-to"
          value={search.to ?? ''}
          onChange={(event) => move({ to: event.target.value || undefined })}
        />
      </div>
    </Card>
  )
}

function LogRow({ entry }: { entry: LogEntry }) {
  const { t, money, date, time } = useI18n()
  const settled = entry.status === 'applied'

  return (
    <Card data-testid="log-row" data-kind={entry.kind}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <Link
            to="/merchant/$connectionId"
            params={{ connectionId: entry.connectionId }}
            className="text-[15px] font-black text-ink"
          >
            {entry.customerName}
          </Link>
          <MobileNumber>{localSaudiMobile(entry.customerMobile)}</MobileNumber>
        </div>
        <b
          className={cx(
            'tabular text-[15px] font-black',
            entry.kind === 'purchase' ? 'text-ink' : 'text-good-text',
          )}
        >
          {money(entry.amountHalalas)}
        </b>
      </div>

      <KeyValueRow label={t(`tx.${entry.kind}`)}>
        {`${date(entry.createdAt)} · ${time(entry.createdAt)}`}
      </KeyValueRow>

      {entry.description ? (
        <p className="mt-1 text-[12.5px] font-bold text-muted">
          {entry.description}
        </p>
      ) : null}

      <div className="mt-2 flex items-center gap-3">
        {/* Anything not on the ledger says so, rather than reading as money
            that moved. */}
        {settled ? null : (
          <span
            className="rounded-full bg-neutral-bg px-2.5 py-1 text-[11px] font-black text-ink"
            data-testid="log-status"
          >
            {t(
              entry.status === 'pending'
                ? 'tx.pending'
                : entry.status === 'cancelled'
                  ? 'tx.cancelled'
                  : 'tx.failed',
            )}
          </span>
        )}
        {entry.invoiceId ? (
          <Link
            to="/invoice/$invoiceId"
            params={{ invoiceId: entry.invoiceId }}
            className="text-[11.5px] font-black text-steel underline"
            data-testid="log-invoice"
          >
            {t('invoice.open')}
          </Link>
        ) : null}
      </div>
    </Card>
  )
}

function PagerLink({
  search,
  to,
  disabled,
  children,
}: {
  search: Search
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
      to="/merchant/log"
      search={{ ...search, page: to > 1 ? to : undefined }}
      className={pagerLinkClass(false)}
    >
      {children}
    </Link>
  )
}
