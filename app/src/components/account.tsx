import { Card, cx } from './primitives'
import { TransactionRow } from './ledger'
import { useI18n } from '#/i18n/context'
import type { ReactNode } from 'react'
import type { transactions } from '#/db/schema'

type Entry = typeof transactions.$inferSelect

/**
 * UC-03: the operations behind a balance, newest first. Both account screens
 * draw this, so a purchase reads the same to the shop and to the customer.
 */
export function TransactionHistory({ entries }: { entries: Array<Entry> }) {
  const { t, date, time } = useI18n()

  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-[13px] font-bold text-muted">
          {t('ledger.noOperations')}
        </p>
      </Card>
    )
  }

  return (
    <Card data-testid="transactions">
      {entries.map((entry) => (
        <TransactionRow
          key={entry.id}
          kind={entry.kind}
          title={
            entry.description ??
            (entry.kind === 'purchase' ? t('tx.purchase') : t('tx.payment'))
          }
          when={`${date(entry.createdAt)} · ${time(entry.createdAt)}`}
          amountHalalas={entry.amountHalalas}
          note={
            entry.status === 'applied' ? undefined : t(`tx.${entry.status}`)
          }
        />
      ))}
    </Card>
  )
}

export function pagerLinkClass(disabled: boolean) {
  return cx(
    'rounded-(--radius-control) px-3 py-2 text-[13px] font-black',
    disabled ? 'text-muted opacity-50' : 'bg-neutral-bg text-ink',
  )
}

/**
 * The two ends of a paged list. The links themselves are built by the screen,
 * which is the only place that knows the route they point at.
 */
export function Pager({
  previous,
  next,
}: {
  previous: ReactNode
  next: ReactNode
}) {
  return (
    <nav
      className="flex items-center justify-between gap-2 py-2"
      data-testid="pager"
    >
      {previous}
      {next}
    </nav>
  )
}
