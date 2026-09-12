import { Outlet, createFileRoute } from '@tanstack/react-router'
import { enterSide } from '#/auth/enter'
import { AmountsEye } from '#/components/amounts-eye'
import { NotificationsBell } from '#/components/notifications'
import { Dock } from '#/components/dock'
import { ProfileMenu } from '#/components/profile'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'

/** The customer's side, with the same stream open behind it. */
export const Route = createFileRoute('/customer')({
  // #79: who is signed in for the profile, what is unread for the bell,
  // and whether this person belongs on this side: one question, in the one
  // hook that keeps its answer. A tap inside the side does not ask again,
  // and the screen's own loader is the only round trip left.
  loader: () => enterSide('customer'),
  // The answer is good until the stream says otherwise, which it does on
  // every notification, and the fallback poll behind it says so anyway.
  staleTime: Infinity,
  component: CustomerSide,
})

function CustomerSide() {
  const { t } = useI18n()
  const { person, unread } = Route.useLoaderData()

  return (
    <>
      <LedgerStream enabled />
      {/* The dock floats at the top of a desktop, where the bar used to hold
          the screen off. */}
      <div className="lg:pt-16">
        <Outlet />
      </div>
      <Dock
        items={[
          { to: '/customer', label: t('nav.ledger'), glyph: '▤' },
          { to: '/customer/card', label: t('nav.card'), glyph: '◧' },
        ]}
      >
        <NotificationsBell to="/customer/notifications" unread={unread} />
        <AmountsEye />
        <ProfileMenu person={person} side="customer" />
      </Dock>
    </>
  )
}
