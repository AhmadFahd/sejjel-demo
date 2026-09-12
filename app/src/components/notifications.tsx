import { Link, useRouter } from '@tanstack/react-router'
import { declineOperationFn } from '#/auth/approval'
import { Button, buttonClass } from '#/components/chrome'
import { Card, cx } from './primitives'
import { useI18n } from '#/i18n/context'
import type { Notification } from '#/db/queries/notifications'

/** UC-12: the bell, with what has not been read yet on it. */
export function NotificationsBell({
  to,
  unread,
}: {
  to: '/merchant/notifications' | '/customer/notifications'
  unread: number
}) {
  const { t, number } = useI18n()

  return (
    <Link
      to={to}
      title={t('notify.open')}
      aria-label={t('notify.open')}
      data-testid="bell"
      data-unread={unread}
      className="relative flex items-center rounded-full px-3 py-2 text-muted transition lg:px-4"
    >
      <BellGlyph />
      {unread > 0 ? (
        <span
          data-testid="bell-badge"
          className="absolute top-0.5 end-1 grid h-4 min-w-4 place-items-center rounded-lg bg-bad px-1 text-[9.5px] font-black text-white"
        >
          {number(unread)}
        </span>
      ) : null}
    </Link>
  )
}

/**
 * The list itself, the same on both sides of the ledger. A purchase still
 * waiting on this person can be answered from here: declining happens on the
 * spot, and approving goes to the screen that shows the code, because an
 * approval nobody can show the shop is no use.
 */
export function NotificationList({
  entries,
}: {
  entries: Array<Notification>
}) {
  const { t, money, date, time } = useI18n()
  const router = useRouter()

  if (entries.length === 0) {
    return (
      <Card>
        <h2 className="mb-1 text-base font-black text-ink">
          {t('notify.empty')}
        </h2>
        <p className="text-[13px] font-bold text-muted">
          {t('notify.emptyBody')}
        </p>
      </Card>
    )
  }

  return (
    <div data-testid="notifications">
      {entries.map((entry) => (
        <Card
          key={entry.id}
          className={cx(entry.readAt ? undefined : 'border-s-4 border-gold')}
          data-testid="notification"
          data-kind={entry.kind}
        >
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-black text-ink">
              {t(`notify.${entry.kind}`)}
            </span>
            <span className="text-[11px] font-bold text-muted">
              {date(entry.createdAt)} · {time(entry.createdAt)}
            </span>
          </div>

          <p className="text-[12.5px] font-bold text-muted">
            {[
              entry.merchantName,
              entry.amountHalalas === null ? null : money(entry.amountHalalas),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {entry.awaitingApproval && entry.transactionId ? (
            <div className="mt-3 grid gap-2">
              <Link
                to="/customer/approve/$transactionId"
                params={{ transactionId: entry.transactionId }}
                className={buttonClass('primary')}
                data-testid="notification-approve"
              >
                {t('approval.approve')}
              </Link>
              <Button
                tone="ghost"
                data-testid="notification-decline"
                onClick={async () => {
                  await declineOperationFn({
                    data: { transactionId: entry.transactionId ?? '' },
                  })
                  await router.invalidate()
                }}
              >
                {t('approval.decline')}
              </Button>
            </div>
          ) : null}

          {/* UC-12: answered once, and it says so rather than offering again. */}
          {entry.actedAt ? (
            <p
              className="mt-2 text-[12px] font-extrabold text-good-text"
              data-testid="notification-acted"
            >
              {t('notify.acted')}
            </p>
          ) : null}
        </Card>
      ))}
    </div>
  )
}

function BellGlyph() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z" />
      <path d="M10.2 18.5a2 2 0 0 0 3.6 0" />
    </svg>
  )
}
