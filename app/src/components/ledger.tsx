import { Card, KeyValueRow, StatusPill, cx } from './primitives'
import { useI18n } from '#/i18n/context'
import type { ReactNode } from 'react'
import type { LedgerStatus } from '#/db/derive'

/** UC-19: the gold strip that says when everything falls due. */
export function PaydayStrip({ onDark = false }: { onDark?: boolean }) {
  const { t } = useI18n()

  return (
    <div
      className={cx(
        'flex items-center gap-2.5 rounded-(--radius-control) p-3',
        onDark
          ? 'border border-white/30 bg-white/15'
          : 'border border-gold/20 bg-linear-135 from-warn-bg to-white',
      )}
    >
      <span
        className={cx(
          'grid size-9 flex-none place-items-center rounded-xl bg-gold',
          onDark ? 'text-ink' : 'text-white',
        )}
        aria-hidden
      >
        <CalendarIcon />
      </span>
      <div>
        <b
          className={cx(
            'block text-[13px] font-black',
            onDark ? 'text-white' : 'text-ink',
          )}
        >
          {t('payday.title')}
        </b>
        <span
          className={cx(
            'text-[11px] font-extrabold',
            onDark ? 'text-gold-light' : 'text-warn-text',
          )}
        >
          {t('payday.note')}
        </span>
      </div>
    </div>
  )
}

/** UC-18: how much of the limit is gone, and how loudly to say so. */
export function LimitBar({
  usedHalalas,
  limitHalalas,
  onDark = false,
}: {
  usedHalalas: number
  limitHalalas: number
  onDark?: boolean
}) {
  const { t, money } = useI18n()
  if (limitHalalas <= 0) return null

  const percent = Math.min(100, Math.round((usedHalalas / limitHalalas) * 100))
  const remaining = Math.max(0, limitHalalas - usedHalalas)

  const fill =
    percent >= 100
      ? 'bg-linear-to-r from-warn to-bad'
      : percent >= 85
        ? 'bg-linear-to-r from-gold to-warn'
        : percent >= 60
          ? 'bg-linear-to-r from-gold-light to-gold'
          : 'bg-linear-to-r from-good/70 to-good'

  const note =
    percent >= 100
      ? t('limit.full')
      : percent >= 85
        ? t('limit.nearlyFull', { percent })
        : t('limit.used', { percent })

  const alarming = percent >= 85

  return (
    <div className="mt-3" data-testid="limit-bar" data-percent={percent}>
      {onDark ? null : (
        <div className="mb-1.5 flex justify-between gap-2.5 text-[11px] font-extrabold text-muted">
          <span>
            {t('ledger.creditLimit')}
            <b className="tabular ms-1 text-[13px] text-ink">
              {money(limitHalalas)}
            </b>
          </span>
          <span>
            {t('ledger.available')}
            <b className="tabular ms-1 text-[13px] text-ink">
              {money(remaining)}
            </b>
          </span>
        </div>
      )}
      <div
        className={cx(
          'h-2.5 overflow-hidden rounded-full',
          onDark ? 'bg-white/20' : 'bg-neutral-bg',
        )}
      >
        <div
          className={cx('h-full rounded-full transition-[width]', fill)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p
        className={cx(
          'mt-1.5 text-[11px] font-extrabold',
          alarming
            ? onDark
              ? 'text-bad-bg'
              : 'text-bad-text'
            : onDark
              ? 'text-white/75'
              : 'text-muted',
        )}
      >
        {note}
      </p>
    </div>
  )
}

/** UC-15: the operations behind the balance. */
export function OperationsCounter({
  purchases,
  payments,
}: {
  purchases: number
  payments: number
}) {
  const { t, number } = useI18n()

  return (
    <Card className="flex items-center gap-3 px-3.5 py-3">
      <span
        className="grid size-10 flex-none place-items-center rounded-xl bg-warn-bg text-warn-text"
        aria-hidden
      >
        <StackIcon />
      </span>
      <div>
        <b className="tabular block text-lg font-black text-ink">
          {number(purchases + payments)}
        </b>
        <span className="text-[11.5px] font-extrabold text-muted">
          {t('ledger.operations')}
        </span>
      </div>
      <div className="ms-auto flex gap-3.5 text-center">
        <div>
          <b className="tabular block text-[15px] font-black text-steel">
            {number(purchases)}
          </b>
          <span className="text-[10.5px] font-extrabold text-muted">
            {t('ledger.purchases')}
          </span>
        </div>
        <div>
          <b className="tabular block text-[15px] font-black text-steel">
            {number(payments)}
          </b>
          <span className="text-[10.5px] font-extrabold text-muted">
            {t('ledger.payments')}
          </span>
        </div>
      </div>
    </Card>
  )
}

/** The dark card at the top of an account: who, how much, and by when. */
export function BalanceHero({
  title,
  subtitle,
  status,
  balanceHalalas,
  facts,
  children,
}: {
  title: string
  subtitle?: ReactNode
  status: LedgerStatus
  balanceHalalas: number
  facts?: Array<{ label: string; value: string }>
  children?: ReactNode
}) {
  const { t, number } = useI18n()

  return (
    <div className="relative mb-3 overflow-hidden rounded-(--radius-hero) bg-linear-140 from-ink to-[#6E877D] p-4.5 text-white">
      <div className="relative z-1 flex items-start justify-between">
        <div>
          <div className="text-[15px] font-black">{title}</div>
          {subtitle}
        </div>
        <StatusPill status={status} />
      </div>

      {children}

      <div className="relative z-1 mt-3 text-[11px] font-extrabold text-white/75">
        {t('ledger.currentBalance')}
      </div>
      <div className="tabular relative z-1 text-[32px] leading-tight font-black">
        {number(balanceHalalas / 100)}{' '}
        <small className="text-[15px] font-extrabold text-gold">
          {t('money.currency')}
        </small>
      </div>

      {facts && facts.length > 0 ? (
        <div className="relative z-1 mt-3.5 grid grid-cols-3 gap-2 border-t border-white/15 pt-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <span className="mb-0.5 block text-[10px] font-extrabold text-white/70">
                {fact.label}
              </span>
              <b className="tabular text-[13px] font-black">{fact.value}</b>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** UC-03: one row of the transaction list. */
export function TransactionRow({
  title,
  when,
  amountHalalas,
  kind,
}: {
  title: string
  when: string
  amountHalalas: number
  kind: 'purchase' | 'payment'
}) {
  const { money } = useI18n()

  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-b-0">
      <div>
        <div className="text-[13.5px] font-extrabold text-ink">{title}</div>
        <div className="text-[11px] font-bold text-muted">{when}</div>
      </div>
      <b
        className={cx(
          'tabular text-[14.5px] font-black',
          kind === 'payment' ? 'text-good-text' : 'text-ink',
        )}
        dir="ltr"
      >
        {kind === 'payment' ? '− ' : '+ '}
        {money(amountHalalas)}
      </b>
    </div>
  )
}

export { KeyValueRow }

function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 10h17M8.5 3v4M15.5 3v4" />
    </svg>
  )
}

function StackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3z" />
      <path d="M3 12.2 12 16.7l9-4.5" />
      <path d="M3 16.9 12 21.4l9-4.5" />
    </svg>
  )
}
