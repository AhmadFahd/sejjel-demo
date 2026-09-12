import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { signOut } from '#/auth/session'
import { useI18n } from '#/i18n/context'
import { useLocaleSwitch } from './use-locale-switch'
import { useSignedInPerson } from './person'
import type { ReactNode } from 'react'

/**
 * PROTOTYPE. What the profile holds, wherever a variant decides to put it.
 * This part is not the question — the three variants disagree about the
 * surface, not about the rows — so they share it.
 *
 * Everything the app bar used to carry is here: the language, the other side
 * of the ledger for somebody who is on both, the shop's settings, and the way
 * out. The mark and the tagline are not: an app you are already inside does
 * not need to tell you its name on every screen.
 */
export function ProfileBody({ onLeave }: { onLeave?: () => void }) {
  const { t } = useI18n()
  const person = useSignedInPerson()
  const locale = useLocaleSwitch()
  const router = useRouter()
  const side = useRouterState({
    select: (state) =>
      state.location.pathname.startsWith('/merchant') ? 'merchant' : 'customer',
  })

  const other = side === 'merchant' ? 'customer' : 'merchant'
  const bothSides = Boolean(person?.roles.merchant) && person?.roles.customer

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
          await router.invalidate()
          await router.navigate({ to: '/sign-in' })
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
  const className = `${ROW} ${tone === 'danger' ? 'text-bad-text' : 'text-ink'}`

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
