import { Outlet, createFileRoute } from '@tanstack/react-router'
import { enterApp } from '#/auth/enter'
import { AmountsEye } from '#/components/amounts-eye'
import { NotificationsBell } from '#/components/notifications'
import { Dock } from '#/components/dock'
import { ProfileMenu } from '#/components/profile'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'
import { SETTLED } from '#/lib/freshness'

/** The customer's side, with the same stream open behind it. */
export const Route = createFileRoute('/customer')({
  // #80: the answer is good until the stream says otherwise, which it does on
  // every notification, and a stream that has stopped saying anything is asked
  // anyway.
  ...SETTLED,
  // #79: who is signed in for the profile and what is unread for the bell,
  // asked in the one hook that keeps its answer. A tap inside the side does
  // not ask again, and the screen's own loader is the only round trip left.
  // The side itself is each screen's own business: `requireSide` reads this
  // answer, because the card under here is open to anybody signed in.
  loader: () => enterApp(),
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
