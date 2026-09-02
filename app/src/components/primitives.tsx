import type { ComponentProps, ReactNode } from 'react'
import type { LedgerStatus } from '#/db/derive'
import { useI18n } from '#/i18n/context'

/** Tailwind classes joined, skipping whatever is false. */
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function Card({ className, children, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      className={cx(
        'mb-3 rounded-(--radius-card) bg-card p-4 shadow-(--shadow-card)',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

const STATUS_STYLE: Record<LedgerStatus, string> = {
  settled: 'bg-good-bg text-good-text',
  overdue: 'bg-bad-bg text-bad-text',
  at_limit: 'bg-neutral-bg text-ink',
  open: 'bg-info-bg text-info-text',
}

/** The prototype's four pills: مسدد, تجاوز الموعد, بلغ الحد, حساب قائم. */
export function StatusPill({ status }: { status: LedgerStatus }) {
  const { t } = useI18n()
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black whitespace-nowrap',
        STATUS_STYLE[status],
      )}
      data-status={status}
    >
      <span className="size-[7px] rounded-full bg-current" />
      {t(`status.${status}`)}
    </span>
  )
}

export function StatTile({
  label,
  value,
  tone = 'plain',
  marked = false,
}: {
  label: string
  value: string
  tone?: 'plain' | 'gold' | 'bad'
  marked?: boolean
}) {
  const toneClass =
    tone === 'gold'
      ? 'text-gold-dark'
      : tone === 'bad'
        ? 'text-bad-text'
        : 'text-ink'

  return (
    <div className="rounded-(--radius-tile) bg-card px-2.5 py-3 text-center shadow-(--shadow-tile)">
      <b className={cx('tabular block text-base font-black', toneClass)}>
        {marked ? <span className="me-1 align-top text-[9px]">▲</span> : null}
        {value}
      </b>
      <span className="text-[10.5px] font-extrabold text-muted">{label}</span>
    </div>
  )
}

export function KeyValueRow({
  label,
  children,
  emphasis = false,
  tone = 'plain',
}: {
  label: string
  children: ReactNode
  emphasis?: boolean
  tone?: 'plain' | 'bad'
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[12.5px] font-bold text-muted">
      <span>{label}</span>
      <b
        className={cx(
          'tabular font-black',
          emphasis ? 'text-[17px]' : 'text-sm',
          tone === 'bad' ? 'text-bad' : 'text-ink',
        )}
      >
        {children}
      </b>
    </div>
  )
}

const AVATAR_TONES = [
  'bg-steel text-white',
  'bg-ink text-white',
  'bg-gold text-ink',
]

export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <div
      className={cx(
        'grid size-11 flex-none place-items-center rounded-full text-[17px] font-black',
        AVATAR_TONES[index % AVATAR_TONES.length],
      )}
      aria-hidden
    >
      {name.slice(0, 1)}
    </div>
  )
}

/** A mobile number reads left to right in either direction. */
export function MobileNumber({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" className="text-xs font-bold text-muted">
      {children}
    </span>
  )
}
