import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { signOut } from '#/auth/session'
import { cx } from './primitives'
import { useI18n } from '#/i18n/context'
import { useLocaleSwitch } from '#/i18n/use-locale-switch'
import type { ReactNode } from 'react'
import type { SignedInUser } from '#/auth/session'
import type { Side } from '#/auth/roles'

/**
 * The person, as the last pill in the dock. The app has one place it keeps its
 * controls, and everything the bar across the top used to hold is in here: the
 * language, the other side of the ledger for somebody who keeps a shop and
 * owes at one, the shop's settings, and the way out.
 *
 * The panel hangs off the dock rather than filling the screen, which is why it
 * is anchored to the end of it: the dock is only as wide as its items.
 */
export function ProfileMenu({
  person,
  side,
}: {
  person: SignedInUser | null
  side: Side
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="profile"
        aria-expanded={open}
        aria-label={t('nav.profile')}
        onClick={() => setOpen(!open)}
        className={cx(
          'flex items-center gap-2 rounded-full px-3 py-2 transition lg:px-4',
          open ? 'bg-ink text-white' : 'text-muted',
        )}
      >
        <PersonGlyph />
      </button>

      {open ? (
        <>
          {/* A press anywhere else puts it away, the way the sheets do. */}
          <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
          {/* Upward from a dock under the thumb, downward from one at the top
              of a desktop. */}
          <div className="absolute end-0 bottom-full mb-3 w-[15.5rem] rounded-(--radius-card) border border-line bg-mist p-2 shadow-(--shadow-card) lg:top-full lg:bottom-auto lg:mt-3 lg:mb-0">
            <ProfileRows
              person={person}
              side={side}
              onLeave={() => setOpen(false)}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

function ProfileRows({
  person,
  side,
  onLeave,
}: {
  person: SignedInUser | null
  side: Side
  onLeave: () => void
}) {
  const { t } = useI18n()
  const locale = useLocaleSwitch()

  const other = side === 'merchant' ? 'customer' : 'merchant'
  const bothSides = Boolean(person?.roles.merchant && person.roles.customer)

  return (
    <div className="grid gap-1.5">
      {person ? (
        <div className="px-1 pb-1">
          <div className="text-[14px] font-black text-ink">{person.name}</div>
          <div dir="ltr" className="tabular text-[12px] font-bold text-muted">
            {person.phoneNumber}
          </div>
        </div>
      ) : null}

      <Row
        testId="locale-switch"
        label={locale.ariaLabel}
        value={locale.label}
        onPress={() => void locale.switchNow()}
      />

      {bothSides ? (
        <Row
          testId="side-switch"
          label={
            other === 'merchant'
              ? t('role.switchToMerchant')
              : t('role.switchToCustomer')
          }
          to={other === 'merchant' ? '/merchant' : '/customer'}
          onPress={onLeave}
        />
      ) : null}

      {person?.roles.merchant ? (
        <Row
          testId="settings"
          label={t('settings.open')}
          to="/merchant/settings"
          onPress={onLeave}
        />
      ) : null}

      <Row
        testId="sign-out"
        label={t('auth.signOut')}
        tone="danger"
        onPress={async () => {
          await signOut()
          // A document load, not a navigation inside one: who is signed in
          // decides what the whole document is, and the shell around the
          // screens is rendered when the document is.
          window.location.assign('/sign-in')
        }}
      />
    </div>
  )
}

const ROW =
  'flex items-center justify-between gap-3 rounded-(--radius-control) bg-card px-3.5 py-3 text-[13.5px] font-black'

function Row({
  testId,
  label,
  value,
  to,
  tone,
  onPress,
}: {
  testId: string
  label: string
  value?: ReactNode
  to?: '/merchant' | '/customer' | '/merchant/settings'
  tone?: 'danger'
  onPress?: () => void
}) {
  const className = cx(ROW, tone === 'danger' ? 'text-bad-text' : 'text-ink')

  if (to) {
    return (
      <Link
        to={to}
        data-testid={testId}
        className={className}
        onClick={onPress}
      >
        <span>{label}</span>
        <span className="text-faint">›</span>
      </Link>
    )
  }

  return (
    <button
      type="button"
      data-testid={testId}
      className={className}
      onClick={onPress}
    >
      <span>{label}</span>
      {value ? <span className="text-steel">{value}</span> : null}
    </button>
  )
}

/** A person, drawn small enough to sit in a dock. */
function PersonGlyph() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      aria-hidden
    >
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
    </svg>
  )
}
